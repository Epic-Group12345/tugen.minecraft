import type { GameHost } from '@tugen/sdk';
import { buildRoot } from './paths';
import type { Build, Loader } from './types';
import { compareGameVersions } from './version';

// Сборки: список в host.storage (ключ 'builds'), папка игры — builds/<id>. В лаунчере список лежал
// в SQLite (lib/db, таблица builds); переноса оттуда пока нет — мини-приложение начинает с
// пустого списка. Основная сборка — роль, а не вид: её запускает «Играть»; id — под ключом 'mainBuild'

export const BUILDS_KEY = 'builds';
export const MAIN_KEY = 'mainBuild';

const LOADERS: readonly Loader[] = [
  'vanilla',
  'fabric',
  'quilt',
  'forge',
  'neoforge',
];

/**
 * Forge ставим только 1.7.10–1.12.2: его описание версии лежит прямо в установщике. С 1.13 Forge
 * (и NeoForge целиком) требует запуска обработчиков установщика на java — этого мы не делаем,
 * а под новые версии есть Fabric и Quilt
 */
export const FORGE_RANGE = { from: '1.7.10', to: '1.12.2' } as const;

export const inForgeRange = (game: string) =>
  compareGameVersions(game, FORGE_RANGE.from) >= 0 &&
  compareGameVersions(game, FORGE_RANGE.to) <= 0;

export class BuildError extends Error {
  constructor(
    public code: 'version' | 'loader-unsupported' | 'not-found' | 'running',
    detail = '',
  ) {
    super(detail || code);
  }
}

const isLoader = (value: unknown): value is Loader =>
  typeof value === 'string' && (LOADERS as readonly string[]).includes(value);

/** Запись из хранилища → сборка; чужое или испорченное — null (такую запись пропускаем) */
function parseBuild(raw: unknown): Build | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const r = raw as Record<string, unknown>;
  if (
    typeof r.id !== 'string' ||
    !r.id ||
    typeof r.name !== 'string' ||
    typeof r.version !== 'string' ||
    !r.version ||
    !isLoader(r.loader) ||
    typeof r.createdAt !== 'number'
  ) {
    return null;
  }
  const build: Build = {
    id: r.id,
    name: r.name,
    version: r.version,
    loader: r.loader,
    createdAt: r.createdAt,
  };
  if (typeof r.loaderVersion === 'string' && r.loaderVersion) {
    build.loaderVersion = r.loaderVersion;
  }
  if (typeof r.lastPlayedAt === 'number') {
    build.lastPlayedAt = r.lastPlayedAt;
  }
  return build;
}

export function parseBuilds(stored: unknown): Build[] {
  if (!Array.isArray(stored)) {
    return [];
  }
  const seen = new Set<string>();
  const out: Build[] = [];
  for (const raw of stored) {
    const build = parseBuild(raw);
    if (build && !seen.has(build.id)) {
      seen.add(build.id);
      out.push(build);
    }
  }
  return out;
}

/** Кому стать основной, если основной нет: недавно запущенная, без запусков — новая */
export const fallbackMain = (builds: readonly Build[]): string | null =>
  [...builds].sort(
    (a, b) =>
      (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0) ||
      b.createdAt - a.createdAt,
  )[0]?.id ?? null;

/** Имя без повторов: «Сборка», «Сборка (2)»… */
export function uniqueName(name: string, builds: readonly Build[]): string {
  const taken = new Set(builds.map(b => b.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) {
    return name;
  }
  for (let n = 2; ; n++) {
    const candidate = `${name} (${n})`;
    if (!taken.has(candidate.toLowerCase())) {
      return candidate;
    }
  }
}

/** Проверить, что сборку с таким загрузчиком мы умеем запустить */
export function checkLoader(loader: Loader, version: string): void {
  if (!isLoader(loader)) {
    throw new BuildError('loader-unsupported', String(loader));
  }
  if (loader === 'neoforge') {
    throw new BuildError('loader-unsupported', 'neoforge');
  }
  if (loader === 'forge' && !inForgeRange(version)) {
    throw new BuildError('loader-unsupported', `forge ${version}`);
  }
}

const newId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Список сборок и основная поверх хранилища игры; снимки неизменяемые — новые на каждое изменение */
export class BuildRepo {
  builds: readonly Build[];
  mainId: string | null;

  constructor(private host: GameHost, private onChange: () => void) {
    this.builds = parseBuilds(host.storage.get<unknown>(BUILDS_KEY, []));
    this.mainId = this.pickMain(host.storage.get<unknown>(MAIN_KEY, null));
  }

  /** Основная всегда из списка: пропала (удалили) — её место занимает другая */
  private pickMain(stored: unknown): string | null {
    if (typeof stored === 'string' && this.builds.some(b => b.id === stored)) {
      return stored;
    }
    return fallbackMain(this.builds);
  }

  private commit(builds: readonly Build[], mainId: unknown = this.mainId) {
    this.builds = builds;
    this.host.storage.set(BUILDS_KEY, builds);
    const next = this.pickMain(mainId);
    this.mainId = next;
    this.host.storage.set(MAIN_KEY, next);
    this.onChange();
  }

  find(id: string): Build | undefined {
    return this.builds.find(b => b.id === id);
  }

  create(input: {
    name: string;
    version: string;
    loader: Loader;
    loaderVersion?: string;
  }): Build {
    const version = input.version.trim();
    if (!version) {
      throw new BuildError('version');
    }
    checkLoader(input.loader, version);
    const build: Build = {
      id: newId(),
      name: uniqueName(input.name.trim() || version, this.builds),
      version,
      loader: input.loader,
      createdAt: Date.now(),
    };
    const loaderVersion = input.loaderVersion?.trim();
    if (input.loader !== 'vanilla' && loaderVersion) {
      build.loaderVersion = loaderVersion;
    }
    // Папка сборки появляется сразу: её можно открыть и положить туда файлы до первого запуска
    this.host.files.writeText(`${buildRoot(build.id)}/.keep`, '');
    this.commit([...this.builds, build]);
    return build;
  }

  update(id: string, patch: Partial<Omit<Build, 'id'>>): void {
    if (this.find(id)) {
      this.commit(this.builds.map(b => (b.id === id ? { ...b, ...patch } : b)));
    }
  }

  /** Удалить сборку вместе с её папкой. Удалили основную — основной станет другая */
  remove(id: string): void {
    if (!this.find(id)) {
      return;
    }
    this.host.files.remove(buildRoot(id));
    this.commit(this.builds.filter(b => b.id !== id));
  }

  setMain(id: string): void {
    if (this.find(id) && this.mainId !== id) {
      this.commit(this.builds, id);
    }
  }
}
