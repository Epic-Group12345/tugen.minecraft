import type { DownloadFile, DownloadProgress, GameHost } from '@tugen/sdk';
import { javaFiles, javaPath, markJava, type JavaPlan } from './java';
import { launchArgs, launchFeatures } from './launch-args';
import { ensureLoaderVersion, latestLoaderVersion } from './loaders';
import type { VersionCatalog } from './mojang';
import {
  assetIndexPath,
  assetObject,
  buildNatives,
  buildRoot,
  libraryPath,
  logConfigPath,
  versionJar,
  versionJson,
} from './paths';
import type { GamePlatform } from './platform';
import type { Build, LaunchErrorCode, McSettings, ServerTarget } from './types';
import {
  javaComponent,
  mergeVersions,
  resolveLibraries,
  type VersionJson,
} from './version';

// Подготовка сборки к запуску: описание версии, Java, библиотеки, ассеты, natives — и команда
// запуска. Что уже скачано, загрузчик SDK проверяет по SHA-1 и не качает заново; без сети
// подготовленная однажды сборка запускается из того, что лежит на диске

const RESOURCES = 'https://resources.download.minecraft.net';
// Цепочка inheritsFrom длиннее не бывает; предел — от зацикленных описаний
const MAX_INHERIT_DEPTH = 4;

export class LaunchError extends Error {
  constructor(public code: LaunchErrorCode, detail = '') {
    super(detail || code);
  }
}

export interface LaunchPlan {
  exe: string;
  args: string[];
  cwd: string;
  /** Коротко для журнала: версия, Java, память */
  summary: string[];
}

export type PrepareStage = 'preparing' | 'downloading' | 'starting';

export interface PrepareContext {
  host: GameHost;
  platform: GamePlatform;
  versions: VersionCatalog;
  launcherVersion: string;
  onStage: (stage: PrepareStage) => void;
  onProgress: (progress: DownloadProgress) => void;
  /** Загрузчик без версии получил её — запомнить в сборке */
  onLoaderVersion: (version: string) => void;
}

/** Пачки загрузки сборки: job = "<id сборки>:<вид>" — по нему stop() отменяет загрузку */
export const JOB_KINDS = ['version', 'meta', 'files'] as const;
export const jobId = (buildId: string, kind: (typeof JOB_KINDS)[number]) =>
  `${buildId}:${kind}`;

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Шаг подготовки: любое исключение — LaunchError с кодом шага */
async function step<T>(code: LaunchErrorCode, run: () => Promise<T>) {
  try {
    return await run();
  } catch (e) {
    throw e instanceof LaunchError ? e : new LaunchError(code, message(e));
  }
}

function readJson<T>(host: GameHost, path: string): T {
  const text = host.files.readText(path);
  if (!text) {
    throw new LaunchError('files', path);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new LaunchError('files', `${path}: bad json`);
  }
}

async function download(
  ctx: PrepareContext,
  job: string,
  files: DownloadFile[],
  code: LaunchErrorCode,
  progress = false,
) {
  if (files.length) {
    await step(code, () =>
      ctx.host.downloads.download(
        job,
        files,
        progress ? ctx.onProgress : undefined,
      ),
    );
  }
}

/** Описание версии; версия загрузчика — вместе с родительской */
async function loadVersion(
  ctx: PrepareContext,
  id: string,
  buildId: string,
  depth = 0,
): Promise<VersionJson> {
  const path = versionJson(id);
  if (!ctx.host.files.exists(path)) {
    const entry = await step('network', () => ctx.versions.find(id));
    if (!entry) {
      throw new LaunchError('version', id);
    }
    const file = { url: entry.url, path, sha1: entry.sha1 || undefined };
    await download(ctx, jobId(buildId, 'version'), [file], 'network');
  }
  const version = readJson<VersionJson>(ctx.host, path);
  if (version.inheritsFrom && depth < MAX_INHERIT_DEPTH) {
    const parent = await loadVersion(
      ctx,
      version.inheritsFrom,
      buildId,
      depth + 1,
    );
    return mergeVersions(version, parent);
  }
  return version;
}

/** id версии для запуска: с загрузчиком — его описание, при надобности скачанное */
async function resolveVersionId(ctx: PrepareContext, build: Build) {
  if (build.loader === 'vanilla') {
    return build.version;
  }
  const loader = build.loader;
  return step('loader', async () => {
    let version = build.loaderVersion;
    if (!version) {
      version =
        (await latestLoaderVersion(ctx.host, loader, build.version)) ?? '';
      if (!version) {
        throw new LaunchError('loader', `${loader} ${build.version}`);
      }
      ctx.onLoaderVersion(version);
    }
    // Описание уже на диске — ensureLoaderVersion сеть не трогает
    return ensureLoaderVersion(ctx.host, build.version, loader, version);
  });
}

interface AssetIndex {
  objects: Record<string, { hash: string; size: number }>;
  /** Старые версии берут ассеты по именам: из assets/virtual/<индекс>… */
  virtual?: boolean;
  /** …или из resources в папке игры */
  map_to_resources?: boolean;
}

/** Подготовить сборку и собрать команду запуска */
export async function prepare(
  ctx: PrepareContext,
  build: Build,
  settings: McSettings,
  server?: ServerTarget,
): Promise<LaunchPlan> {
  const { host, platform } = ctx;
  const id = build.id;
  const features = launchFeatures(settings);

  ctx.onStage('preparing');
  const version = await loadVersion(
    ctx,
    await resolveVersionId(ctx, build),
    id,
  );
  const log = version.logging?.client;
  const assetsId = version.assetIndex?.id ?? version.assets ?? 'legacy';
  const meta: DownloadFile[] = [];
  if (version.assetIndex) {
    const a = version.assetIndex;
    meta.push({
      url: a.url,
      path: assetIndexPath(a.id),
      sha1: a.sha1,
      size: a.size,
    });
  }
  if (log) {
    const f = log.file;
    meta.push({
      url: f.url,
      path: logConfigPath(f.id),
      sha1: f.sha1,
      size: f.size,
    });
  }
  await download(ctx, jobId(id, 'meta'), meta, 'network');

  const wanted = javaComponent(version);
  const javaPlan: JavaPlan | null = await step('java', () =>
    javaFiles(host, wanted, platform),
  );
  const java = javaPath(javaPlan?.component ?? wanted, platform);

  const jarId = version.jar ?? version.id;
  const libraries = resolveLibraries(version, platform, features);
  const files: DownloadFile[] = [];
  const client = version.downloads?.client;
  if (client) {
    files.push({
      url: client.url,
      path: versionJar(jarId),
      sha1: client.sha1,
      size: client.size,
    });
  }
  for (const lib of [...libraries.classpath, ...libraries.natives]) {
    files.push({
      url: lib.url,
      path: libraryPath(lib.path),
      sha1: lib.sha1,
      size: lib.size,
    });
  }
  const index: AssetIndex = version.assetIndex
    ? readJson<AssetIndex>(host, assetIndexPath(assetsId))
    : { objects: {} };
  const hashes = new Set<string>();
  for (const { hash, size } of Object.values(index.objects ?? {})) {
    if (!hashes.has(hash)) {
      hashes.add(hash);
      const url = `${RESOURCES}/${hash.slice(0, 2)}/${hash}`;
      files.push({ url, path: assetObject(hash), sha1: hash, size });
    }
  }
  files.push(...(javaPlan?.files ?? []));

  ctx.onStage('downloading');
  await download(ctx, jobId(id, 'files'), files, 'files', true);
  if (javaPlan) {
    await step('java', () => markJava(host, javaPlan));
  }

  ctx.onStage('starting');
  const gameDir = buildRoot(id);
  // Старые версии читают ассеты по именам файлов, а не из хранилища по хэшам: раскладываем
  // объекты жёсткими ссылками — место на диске второй раз не тратится
  let gameAssets = 'assets';
  if (index.virtual || index.map_to_resources) {
    gameAssets = index.map_to_resources
      ? `${gameDir}/resources`
      : `assets/virtual/${assetsId}`;
    const entries = Object.entries(index.objects);
    await step('files', () =>
      host.files.materialize(
        entries.map(([, { hash }]) => assetObject(hash)),
        entries.map(([name]) => `${gameAssets}/${name}`),
        [],
      ),
    );
  }

  const natives = buildNatives(id);
  host.files.remove(natives);
  for (const lib of libraries.natives) {
    const ok = await step('natives', () =>
      host.files.extract(libraryPath(lib.path), natives, lib.exclude),
    );
    if (!ok) {
      throw new LaunchError('natives', lib.path);
    }
  }

  const args = launchArgs({
    version,
    libraries,
    platform,
    settings,
    launcherVersion: ctx.launcherVersion,
    gameDir,
    natives,
    gameAssets,
    assetsId,
    absolute: path => host.files.absolutePath(path),
    server,
  });
  return {
    exe: java,
    args,
    cwd: gameDir,
    summary: [
      `Minecraft ${version.id} (${version.type})`,
      `Java: ${host.files.absolutePath(java)}`,
      `${settings.memoryMb} MB · ${settings.nickname}`,
    ],
  };
}
