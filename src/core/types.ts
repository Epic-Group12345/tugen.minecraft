// Контракт ядра Minecraft для UI мини-приложения. Имена держим как договорились с UI: экраны
// пишутся под них параллельно с ядром. Реэкспортируется из index.ts

export interface McSettings {
  /** Ник офлайн-игрока: 3–16 символов, латиница, цифры и «_» */
  nickname: string;
  /** Память java (-Xmx), МБ */
  memoryMb: number;
  /** Свои аргументы java одной строкой */
  jvmArgs: string;
  /** Размер окна игры; 0 — как решит сама игра */
  windowWidth: number;
  windowHeight: number;
}

export type Loader = 'vanilla' | 'fabric' | 'quilt' | 'forge' | 'neoforge';

export type ModLoader = Exclude<Loader, 'vanilla'>;

export type BuildFolder =
  | ''
  | 'saves'
  | 'mods'
  | 'resourcepacks'
  | 'shaderpacks'
  | 'screenshots'
  | 'logs';

export interface Build {
  id: string;
  name: string;
  /** id версии Minecraft из манифеста Mojang */
  version: string;
  loader: Loader;
  /** Версия загрузчика; нет — при первом запуске берётся последняя и запоминается */
  loaderVersion?: string;
  createdAt: number;
  lastPlayedAt?: number;
}

export interface McVersion {
  id: string;
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha';
  releaseTime: string;
}

export type LaunchPhase =
  | 'idle'
  | 'preparing'
  | 'downloading'
  | 'starting'
  | 'running'
  | 'failed';

/**
 * Код ошибки запуска в LaunchState.error — UI переводит его в текст сам; подробности (сообщение
 * исключения) уходят в журнал сборки
 */
export type LaunchErrorCode =
  | 'nickname'
  | 'version'
  | 'loader'
  | 'network'
  | 'files'
  | 'natives'
  | 'java'
  | 'start'
  | 'crash';

export interface LaunchState {
  phase: LaunchPhase;
  progress?: { done: number; total: number };
  /** LaunchErrorCode при phase 'failed' */
  error?: string;
  /** Последние строки журнала, не больше 500 */
  log: string[];
}

export interface MinecraftCore {
  getSettings(): McSettings;
  setSettings(patch: Partial<McSettings>): void;
  memoryRange(): { min: number; max: number; recommended: number };
  isValidNickname(nick: string): boolean;

  listBuilds(): Build[];
  createBuild(input: {
    name: string;
    version: string;
    loader: Loader;
    loaderVersion?: string;
  }): Build;
  renameBuild(buildId: string, name: string): Build;
  duplicateBuild(buildId: string, name: string): Promise<Build>;
  removeBuild(id: string): void;
  getMainBuildId(): string | null;
  setMainBuild(id: string): void;

  listVersions(includeSnapshots?: boolean): Promise<McVersion[]>;
  listLoaderVersions(loader: ModLoader, mcVersion: string): Promise<string[]>;

  launch(buildId: string, server?: ServerTarget): Promise<void>;
  stop(buildId: string): void;
  getLaunchState(buildId: string): LaunchState;

  openBuildFolder(buildId: string, folder?: BuildFolder): void;

  /** Любое изменение настроек, сборок или состояния запуска */
  subscribe(listener: () => void): () => void;
}

export interface ServerTarget {
  /** Проверенное DNS-имя, IPv4 или IPv6 без квадратных скобок */
  address: string;
  port: number;
}
