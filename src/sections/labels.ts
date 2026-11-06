import type { Build, LaunchPhase, Loader } from '../core';
import type { StringKey, Vars } from '../i18n';

type Translate = (key: StringKey, vars?: Vars) => string;

// Названия загрузчиков — имена собственные, не переводятся
export const LOADERS: readonly Loader[] = [
  'vanilla',
  'fabric',
  'quilt',
  'forge',
  'neoforge',
];

export const LOADER_NAMES: Record<Loader, string> = {
  vanilla: 'Vanilla',
  fabric: 'Fabric',
  quilt: 'Quilt',
  forge: 'Forge',
  neoforge: 'NeoForge',
};

/** «1.21.4 · Fabric 0.16.9» */
export function describeBuild(build: Build): string {
  const loader = LOADER_NAMES[build.loader];
  if (build.loader === 'vanilla') {
    return `${build.version} · ${loader}`;
  }
  return `${build.version} · ${loader}${
    build.loaderVersion ? ` ${build.loaderVersion}` : ''
  }`;
}

/** Идёт подготовка или запуск: кнопка «Играть» ждёт */
export const isBusy = (phase: LaunchPhase) =>
  phase === 'preparing' || phase === 'downloading' || phase === 'starting';

const PHASE_KEYS: Partial<Record<LaunchPhase, StringKey>> = {
  preparing: 'phase.preparing',
  downloading: 'phase.downloading',
  starting: 'phase.starting',
  running: 'phase.running',
  failed: 'phase.failed',
};

export const phaseText = (phase: LaunchPhase, tr: Translate) => {
  const key = PHASE_KEYS[phase];
  return key ? tr(key) : '';
};

const ERROR_KEYS: Record<string, StringKey> = {
  nickname: 'error.nickname',
  version: 'error.version',
  loader: 'error.loader',
  network: 'error.network',
  files: 'error.files',
  natives: 'error.natives',
  java: 'error.java',
  start: 'error.start',
  crash: 'error.crash',
};

/** Код ошибки ядра (LaunchErrorCode) — в текст; незнакомый показываем как есть */
export const errorText = (error: string, tr: Translate) => {
  const key = ERROR_KEYS[error];
  return key ? tr(key) : tr('error.unknown', { error });
};
