import type { GamePlatform } from './platform';

// Описание версии Minecraft (versions/<id>/<id>.json) — чистые функции без сети и файлов: какие
// библиотеки нужны на этой системе, что распаковать из нативных jar, какие аргументы передать
// java и игре. Формат — публичный формат файлов версий Mojang. Система передаётся параметром

export interface Rule {
  action: 'allow' | 'disallow';
  os?: { name?: string; arch?: string; version?: string };
  features?: Record<string, boolean>;
}

export type Argument = string | { rules?: Rule[]; value: string | string[] };

export interface Artifact {
  path?: string;
  url: string;
  sha1?: string;
  size?: number;
}

export interface Library {
  /** Координаты Maven: группа:артефакт:версия[:классификатор][@расширение] */
  name: string;
  /** Репозиторий Maven для библиотек без downloads (загрузчики модов) */
  url?: string;
  /** Хэш и размер библиотеки без downloads — их даёт Fabric Meta */
  sha1?: string;
  size?: number;
  downloads?: { artifact?: Artifact; classifiers?: Record<string, Artifact> };
  /** Старые версии: классификатор нативного jar по системе ("natives-windows-${arch}") */
  natives?: Record<string, string>;
  extract?: { exclude?: string[] };
  rules?: Rule[];
}

export interface LoggingConfig {
  argument: string;
  type: string;
  file: { id: string; sha1: string; size: number; url: string };
}

export interface VersionJson {
  id: string;
  type: string;
  mainClass: string;
  inheritsFrom?: string;
  /** Чей jar запускать — у версий загрузчиков он от родительской версии */
  jar?: string;
  /** До 1.13 — аргументы игры одной строкой */
  minecraftArguments?: string;
  arguments?: { game?: Argument[]; jvm?: Argument[] };
  libraries: Library[];
  assetIndex?: {
    id: string;
    sha1: string;
    size: number;
    totalSize?: number;
    url: string;
  };
  assets?: string;
  downloads?: { client?: Artifact };
  javaVersion?: { component: string; majorVersion: number };
  logging?: { client?: LoggingConfig };
  releaseTime?: string;
}

export type Features = Record<string, boolean>;

const ruleMatches = (
  rule: Rule,
  platform: GamePlatform,
  features: Features,
) => {
  const os = rule.os;
  if (os) {
    if (os.name && os.name !== platform.name) {
      return false;
    }
    if (os.arch && os.arch !== platform.arch) {
      return false;
    }
    if (os.version) {
      try {
        if (!new RegExp(os.version).test(platform.version)) {
          return false;
        }
      } catch {
        // Кривое регулярное выражение в описании — правило не подходит, а не падение запуска
        return false;
      }
    }
  }
  return Object.entries(rule.features ?? {}).every(
    ([key, value]) => (features[key] ?? false) === value,
  );
};

/** Правила разрешают: без правил — да; с правилами — решает последнее подошедшее, по умолчанию нет */
export function rulesAllow(
  rules: Rule[] | undefined,
  platform: GamePlatform,
  features: Features = {},
): boolean {
  if (!rules?.length) {
    return true;
  }
  let allowed = false;
  for (const rule of rules) {
    if (ruleMatches(rule, platform, features)) {
      allowed = rule.action === 'allow';
    }
  }
  return allowed;
}

interface Coordinates {
  group: string;
  artifact: string;
  version: string;
  classifier?: string;
  ext: string;
}

export function parseMaven(name: string): Coordinates | null {
  const [coords, ext = 'jar'] = name.split('@');
  const [group, artifact, version, classifier] = coords.split(':');
  if (!group || !artifact || !version) {
    return null;
  }
  return { group, artifact, version, classifier, ext };
}

/** Путь библиотеки в репозитории Maven: com/mojang/brigadier/1.0.18/brigadier-1.0.18.jar */
export function mavenPath(name: string, classifier?: string): string {
  const c = parseMaven(name);
  if (!c) {
    return '';
  }
  const cls = classifier ?? c.classifier;
  const file = `${c.artifact}-${c.version}${cls ? `-${cls}` : ''}.${c.ext}`;
  return `${c.group.replace(/\./g, '/')}/${c.artifact}/${c.version}/${file}`;
}

const MOJANG_LIBRARIES = 'https://libraries.minecraft.net/';

export interface LibraryFile {
  /** Путь внутри папки libraries */
  path: string;
  url: string;
  sha1?: string;
  size?: number;
}

export interface ResolvedLibraries {
  /** Файлы для classpath — по порядку, без повторов */
  classpath: LibraryFile[];
  /** Нативные jar старых версий: их распаковывают в папку natives */
  natives: (LibraryFile & { exclude: string[] })[];
}

function artifactFile(
  lib: Library,
  artifact: Artifact | undefined,
  classifier?: string,
): LibraryFile | null {
  const path = artifact?.path || mavenPath(lib.name, classifier);
  if (!path) {
    return null;
  }
  const base = lib.url
    ? lib.url.endsWith('/')
      ? lib.url
      : `${lib.url}/`
    : MOJANG_LIBRARIES;
  // Хэш на самой записи — у основного jar; у классификатора его нет
  const own = !artifact && !classifier;
  return {
    path,
    url: artifact?.url || `${base}${path}`,
    sha1: artifact ? artifact.sha1 : own ? lib.sha1 : undefined,
    size: artifact ? artifact.size : own ? lib.size : undefined,
  };
}

/** Ключ библиотеки без версии: та же библиотека из версии загрузчика заменяет родительскую */
const libraryKey = (name: string) => {
  const c = parseMaven(name);
  return c ? `${c.group}:${c.artifact}:${c.classifier ?? ''}` : name;
};

export function resolveLibraries(
  version: VersionJson,
  platform: GamePlatform,
  features: Features = {},
): ResolvedLibraries {
  const classpath: LibraryFile[] = [];
  const natives: ResolvedLibraries['natives'] = [];
  const seen = new Set<string>();
  const paths = new Set<string>();

  for (const lib of version.libraries ?? []) {
    if (!rulesAllow(lib.rules, platform, features)) {
      continue;
    }
    const key = libraryKey(lib.name);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    const nativeClassifier = lib.natives?.[platform.name]?.replace(
      '${arch}',
      '64',
    );
    if (nativeClassifier) {
      const artifact = lib.downloads?.classifiers?.[nativeClassifier];
      const file = artifactFile(lib, artifact, nativeClassifier);
      if (file) {
        natives.push({ ...file, exclude: lib.extract?.exclude ?? [] });
      }
    }
    // У чисто нативной записи старого формата основного jar нет — только классификатор
    if (lib.downloads && !lib.downloads.artifact) {
      continue;
    }
    const file = artifactFile(lib, lib.downloads?.artifact);
    if (file && !paths.has(file.path)) {
      paths.add(file.path);
      classpath.push(file);
    }
  }
  return { classpath, natives };
}

/** Версия загрузчика поверх родительской: свои библиотеки — первыми, аргументы — дописываются */
export function mergeVersions(
  child: VersionJson,
  parent: VersionJson,
): VersionJson {
  const hasArguments = child.arguments || parent.arguments;
  return {
    ...parent,
    ...child,
    jar: child.jar ?? parent.jar ?? parent.id,
    libraries: [...(child.libraries ?? []), ...(parent.libraries ?? [])],
    arguments: hasArguments
      ? {
          game: [
            ...(parent.arguments?.game ?? []),
            ...(child.arguments?.game ?? []),
          ],
          jvm: [
            ...(parent.arguments?.jvm ?? []),
            ...(child.arguments?.jvm ?? []),
          ],
        }
      : undefined,
    minecraftArguments: child.minecraftArguments ?? parent.minecraftArguments,
    assetIndex: child.assetIndex ?? parent.assetIndex,
    assets: child.assets ?? parent.assets,
    downloads: child.downloads ?? parent.downloads,
    javaVersion: child.javaVersion ?? parent.javaVersion,
    logging: child.logging ?? parent.logging,
    inheritsFrom: undefined,
  };
}

/** Подставить ${переменные}; неизвестные остаются как есть */
export const expand = (template: string, vars: Record<string, string>) =>
  template.replace(
    /\$\{([A-Za-z0-9_]+)\}/g,
    (match, key: string) => vars[key] ?? match,
  );

function collect(
  list: Argument[] | undefined,
  platform: GamePlatform,
  features: Features,
): string[] {
  const out: string[] = [];
  for (const arg of list ?? []) {
    if (typeof arg === 'string') {
      out.push(arg);
    } else if (rulesAllow(arg.rules, platform, features)) {
      out.push(...(Array.isArray(arg.value) ? arg.value : [arg.value]));
    }
  }
  return out;
}

const LEGACY_JVM = [
  '-Djava.library.path=${natives_directory}',
  '-Dminecraft.launcher.brand=${launcher_name}',
  '-cp',
  '${classpath}',
];

/** Аргументы java из версии; у старых версий их нет — тогда путь к natives и classpath */
export function jvmArguments(
  version: VersionJson,
  vars: Record<string, string>,
  platform: GamePlatform,
  features: Features = {},
): string[] {
  const list = version.arguments?.jvm?.length
    ? collect(version.arguments.jvm, platform, features)
    : LEGACY_JVM;
  return list.map(arg => expand(arg, vars));
}

/** Аргументы игры. Своё разрешение окна старым версиям — дописываем сами */
export function gameArguments(
  version: VersionJson,
  vars: Record<string, string>,
  platform: GamePlatform,
  features: Features = {},
): string[] {
  if (version.arguments?.game?.length) {
    return collect(version.arguments.game, platform, features).map(arg =>
      expand(arg, vars),
    );
  }
  const list = (version.minecraftArguments ?? '')
    .split(' ')
    .filter(Boolean)
    .map(arg => expand(arg, vars));
  if (
    features.has_custom_resolution &&
    vars.resolution_width &&
    vars.resolution_height
  ) {
    list.push(
      '--width',
      vars.resolution_width,
      '--height',
      vars.resolution_height,
    );
  }
  return list;
}

/** Компонент Java от Mojang, нужный версии; у старых версий его нет — им нужна Java 8 */
export const javaComponent = (version: VersionJson) =>
  version.javaVersion?.component ?? 'jre-legacy';

/** Аргументы java игрока одной строкой → список; кавычки держат пробелы внутри */
export function splitArgs(line: string): string[] {
  const out: string[] = [];
  for (const [, quoted, plain] of line.matchAll(/"([^"]*)"|(\S+)/g)) {
    out.push(quoted ?? plain);
  }
  return out;
}

/**
 * Сравнить версии игры: числовые — по числам; нечисловые (снапшоты) — новее любой числовой,
 * потому что выходят перед следующим релизом
 */
export function compareGameVersions(a: string, b: string): number {
  const parse = (v: string) =>
    /^\d+(\.\d+)*$/.test(v) ? v.split('.').map(Number) : null;
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) {
    return pa ? -1 : pb ? 1 : 0;
  }
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) {
      return d;
    }
  }
  return 0;
}
