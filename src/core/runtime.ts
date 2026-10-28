import type { GameHost } from '@tugen/sdk';
import { LogParser, type LogLine } from './logs';
import { isValidNickname } from './settings';
import {
  JOB_KINDS,
  jobId,
  LaunchError,
  prepare,
  type PrepareContext,
} from './prepare';
import type { Build, LaunchErrorCode, LaunchState, McSettings } from './types';

// Запуск сборок: состояние каждой (готовится, качает, запущена, упала), журнал и остановка. Одна
// сборка — один процесс игры (id процесса = id сборки); разные сборки можно запускать вместе.
// Состояния неизменяемые: на каждое изменение — новый объект, и useSyncExternalStore видит смену

/** Журнал в состоянии — последние строки; дальше старые уходят */
export const MAX_LOG_LINES = 500;

export const IDLE: LaunchState = Object.freeze({
  phase: 'idle',
  log: Object.freeze([]) as unknown as string[],
});

const BUSY = new Set<LaunchState['phase']>([
  'preparing',
  'downloading',
  'starting',
  'running',
]);

export const appendLines = (
  log: readonly string[],
  lines: readonly string[],
) => {
  if (!lines.length) {
    return log as string[];
  }
  const next = [...log, ...lines];
  return next.length > MAX_LOG_LINES ? next.slice(-MAX_LOG_LINES) : next;
};

const texts = (lines: Omit<LogLine, 'key'>[]) => lines.map(l => l.text);

export interface RuntimeDeps {
  host: GameHost;
  context: Omit<PrepareContext, 'onStage' | 'onProgress' | 'onLoaderVersion'>;
  findBuild: (id: string) => Build | undefined;
  updateBuild: (id: string, patch: Partial<Omit<Build, 'id'>>) => void;
  getSettings: () => McSettings;
  onChange: () => void;
}

export class LaunchManager {
  private states = new Map<string, LaunchState>();
  // Попытка запуска: stop() и новый запуск делают прежнюю устаревшей — её поздние шаги не пишут состояние
  private attempts = new Map<string, number>();
  // Сборки, которые остановил игрок: их выход — не вылет
  private stopped = new Set<string>();
  // Процессы, запущенные в этом сеансе: только о них придёт onExit
  private attached = new Set<string>();

  constructor(private deps: RuntimeDeps) {
    // Игры, пережившие перезагрузку мини-приложения: процесс идёт, но его журнал и выход
    // приходили прежним обработчикам — показываем «запущена», остановить можно
    for (const id of deps.host.process.running()) {
      if (deps.findBuild(id)) {
        this.states.set(id, { phase: 'running', log: [] });
      }
    }
  }

  get(id: string): LaunchState {
    return this.states.get(id) ?? IDLE;
  }

  isBusy(id: string): boolean {
    return BUSY.has(this.get(id).phase);
  }

  private set(id: string, patch: Partial<LaunchState>) {
    const prev = this.get(id);
    this.states.set(id, { phase: prev.phase, log: prev.log, ...patch });
    this.deps.onChange();
  }

  private log(id: string, lines: readonly string[]) {
    if (lines.length) {
      this.set(id, {
        ...this.get(id),
        log: appendLines(this.get(id).log, lines),
      });
    }
  }

  private fail(id: string, code: LaunchErrorCode, detail?: string) {
    const log = detail
      ? appendLines(this.get(id).log, [detail])
      : this.get(id).log;
    this.set(id, { phase: 'failed', error: code, progress: undefined, log });
  }

  async launch(buildId: string): Promise<void> {
    const build = this.deps.findBuild(buildId);
    if (!build || this.isBusy(buildId)) {
      return;
    }
    const attempt = (this.attempts.get(buildId) ?? 0) + 1;
    this.attempts.set(buildId, attempt);
    const current = () => this.attempts.get(buildId) === attempt;
    this.stopped.delete(buildId);
    this.states.set(buildId, { phase: 'preparing', log: [] });
    this.deps.onChange();

    const settings = this.deps.getSettings();
    if (!isValidNickname(settings.nickname)) {
      this.fail(buildId, 'nickname', settings.nickname);
      return;
    }
    try {
      const plan = await prepare(
        {
          ...this.deps.context,
          onStage: phase => current() && this.set(buildId, { phase }),
          onProgress: ({ done, total }) =>
            current() && this.set(buildId, { progress: { done, total } }),
          onLoaderVersion: loaderVersion =>
            this.deps.updateBuild(buildId, { loaderVersion }),
        },
        build,
        settings,
      );
      if (!current()) {
        return;
      }
      this.set(buildId, { phase: 'starting', progress: undefined });
      this.log(buildId, plan.summary);
      this.start(buildId, plan);
    } catch (e) {
      if (!current()) {
        return;
      }
      const code = e instanceof LaunchError ? e.code : 'start';
      this.fail(buildId, code, e instanceof Error ? e.message : String(e));
    }
  }

  private start(
    id: string,
    plan: { exe: string; args: string[]; cwd: string },
  ) {
    const parser = new LogParser();
    try {
      this.deps.host.process.launch(id, {
        exe: plan.exe,
        args: plan.args,
        cwd: plan.cwd,
        onLog: text => this.log(id, texts(parser.feed(text))),
        onExit: code => {
          this.attached.delete(id);
          this.log(id, [...texts(parser.flush()), `exit ${code}`]);
          // Остановил сам игрок — не вылет, какой бы код ни вернула игра
          if (code !== 0 && !this.stopped.has(id)) {
            this.set(id, { phase: 'failed', error: 'crash' });
          } else {
            this.set(id, { phase: 'idle', error: undefined });
          }
          this.stopped.delete(id);
        },
      });
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      this.fail(id, detail.includes('no-java') ? 'java' : 'start', detail);
      return;
    }
    this.attached.add(id);
    this.set(id, { phase: 'running' });
    this.deps.updateBuild(id, { lastPlayedAt: Date.now() });
  }

  /** Остановить: готовящуюся — отменить загрузку, запущенную — закрыть игру */
  stop(id: string): void {
    const state = this.get(id);
    if (!this.isBusy(id)) {
      return;
    }
    this.stopped.add(id);
    if (state.phase === 'running') {
      this.deps.host.process.kill(id);
      // Выход процесса из прошлого сеанса сюда не придёт — считаем его остановленным сразу
      if (!this.attached.has(id)) {
        this.stopped.delete(id);
        this.set(id, { phase: 'idle' });
      }
      return;
    }
    // Подготовка обрывается сразу: поздние шаги прежней попытки состояние уже не тронут
    this.attempts.set(id, (this.attempts.get(id) ?? 0) + 1);
    JOB_KINDS.forEach(kind => this.deps.host.downloads.cancel(jobId(id, kind)));
    this.set(id, { phase: 'idle', progress: undefined, error: undefined });
  }

  /** Сборку удалили — её состояние больше не нужно */
  forget(id: string): void {
    this.states.delete(id);
    this.attempts.delete(id);
    this.stopped.delete(id);
    this.attached.delete(id);
  }
}
