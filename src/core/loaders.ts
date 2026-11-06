import type { GameHost } from '@tugen/sdk';
import { inForgeRange } from './builds';
import { libraryPath, versionJson } from './paths';
import type { ModLoader } from './types';
import { mavenPath, type Library, type VersionJson } from './version';

// Загрузчики модов. Описание версии загрузчика — в формате Mojang поверх обычной (inheritsFrom):
// оно ложится в versions/ рядом с версиями Mojang, и дальше запуск идёт как у любой версии.
// Fabric и Quilt отдают готовое описание по сети (Meta). Forge 1.7.10–1.12.2 — из установщика.
// Forge 1.13+ и NeoForge требуют обработчиков установщика на java — их не запускаем (builds.ts)

const FABRIC_META = 'https://meta.fabricmc.net/v2';
const QUILT_META = 'https://meta.quiltmc.org/v3';
const FORGE_MAVEN = 'https://maven.minecraftforge.net/';
const FORGE_PROMOS =
  'https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json';
const FORGE_METADATA = `${FORGE_MAVEN}net/minecraftforge/forge/maven-metadata.xml`;

const META: Record<'fabric' | 'quilt', string> = {
  fabric: FABRIC_META,
  quilt: QUILT_META,
};

interface MetaLoaderEntry {
  loader: { version: string; stable?: boolean };
}

/** Версию игры, которой Meta не знает, она отклоняет кодом 400/404, а не пустым списком */
const isUnknownVersion = (e: unknown) =>
  e instanceof Error && /HTTP 40[04]\b/.test(e.message);

async function metaVersions(
  host: GameHost,
  kind: 'fabric' | 'quilt',
  game: string,
): Promise<MetaLoaderEntry[]> {
  try {
    const list = await host.net.fetchJson<MetaLoaderEntry[]>(
      `${META[kind]}/versions/loader/${encodeURIComponent(game)}`,
    );
    return Array.isArray(list)
      ? list.filter(e => typeof e?.loader?.version === 'string')
      : [];
  } catch (e) {
    if (isUnknownVersion(e)) {
      return [];
    }
    throw e;
  }
}

/** Версии Forge из Maven под версию игры — от новых к старым */
export function forgeVersionsFrom(metadata: string, game: string): string[] {
  const all = [...metadata.matchAll(/<version>([^<]+)<\/version>/g)].map(
    m => m[1],
  );
  return all.filter(v => v.startsWith(`${game}-`)).reverse();
}

/** Версии загрузчика под версию игры, от новых к старым; пусто — под эту версию его нет */
export async function loaderVersions(
  host: GameHost,
  loader: ModLoader,
  game: string,
): Promise<string[]> {
  if (loader === 'fabric' || loader === 'quilt') {
    const list = await metaVersions(host, loader, game);
    return [...new Set(list.map(e => e.loader.version))];
  }
  if (loader === 'forge' && inForgeRange(game)) {
    return forgeVersionsFrom(await host.net.fetchText(FORGE_METADATA), game);
  }
  return [];
}

/**
 * Версия загрузчика по умолчанию: стабильный Fabric, Quilt без «-beta», рекомендованный Forge
 * (нет рекомендованного — последний). null — под эту версию игры загрузчика нет
 */
export async function latestLoaderVersion(
  host: GameHost,
  loader: ModLoader,
  game: string,
): Promise<string | null> {
  if (loader === 'fabric' || loader === 'quilt') {
    const list = await metaVersions(host, loader, game);
    const stable =
      loader === 'fabric'
        ? list.find(e => e.loader.stable)
        : list.find(e => !e.loader.version.includes('-'));
    return (stable ?? list[0])?.loader.version ?? null;
  }
  if (loader !== 'forge' || !inForgeRange(game)) {
    return null;
  }
  const promos = await host.net.fetchJson<{ promos?: Record<string, string> }>(
    FORGE_PROMOS,
  );
  const build =
    promos.promos?.[`${game}-recommended`] ?? promos.promos?.[`${game}-latest`];
  const versions = forgeVersionsFrom(
    await host.net.fetchText(FORGE_METADATA),
    game,
  );
  if (!build) {
    return versions[0] ?? null;
  }
  // У старых Forge к версии приписана версия игры («1.7.10-10.13.4.1614-1.7.10») — берём из списка
  const prefix = `${game}-${build}`;
  return (
    versions.find(v => v === prefix) ??
    versions.find(v => v.startsWith(`${prefix}-`)) ??
    null
  );
}

/** id версии, которую запускать: у ванилы — сама версия, с загрузчиком — его версия поверх неё */
export function launchVersionId(
  game: string,
  loader: ModLoader | 'vanilla',
  version?: string,
): string {
  if (loader === 'vanilla' || !version) {
    return game;
  }
  if (loader === 'forge') {
    return `forge-${version}`;
  }
  return `${loader}-loader-${version}-${game}`;
}

/** Описание версии загрузчика — в versions/: скачать или достать из установщика, если его нет */
export async function ensureLoaderVersion(
  host: GameHost,
  game: string,
  loader: ModLoader,
  version: string,
): Promise<string> {
  const id = launchVersionId(game, loader, version);
  if (host.files.exists(versionJson(id))) {
    return id;
  }
  if (loader === 'fabric' || loader === 'quilt') {
    const url = `${META[loader]}/versions/loader/${encodeURIComponent(
      game,
    )}/${encodeURIComponent(version)}/profile/json`;
    host.files.writeText(versionJson(id), await host.net.fetchText(url));
  } else if (loader === 'forge') {
    await installForge(host, id, game, version);
  } else {
    throw new Error(`loader ${loader} is not supported`);
  }
  return id;
}

export interface ForgeProfile {
  /** Старый формат (1.7.10 – ранние 1.12.2): описание версии прямо в профиле */
  versionInfo?: VersionJson;
  install?: { path: string; filePath: string };
  /** Новый формат: описание — отдельным файлом, свои файлы — в maven/ установщика */
  json?: string;
  processors?: unknown[];
}

const FORGE_OLD_MAVEN = /^https?:\/\/files\.minecraftforge\.net\/maven\/?$/;

/** Описание версии из профиля установщика Forge и что из установщика скопировать в libraries */
export function forgeVersionFrom(
  profile: ForgeProfile,
  readJson: (path: string) => VersionJson,
  id: string,
  game: string,
): { json: VersionJson; copies: { from: string; to: string }[] } {
  if (profile.processors?.length) {
    throw new Error('forge installer with processors is not supported');
  }
  let info: VersionJson;
  const copies: { from: string; to: string }[] = [];
  if (profile.versionInfo && profile.install) {
    info = profile.versionInfo;
    copies.push({
      from: profile.install.filePath,
      to: libraryPath(mavenPath(profile.install.path)),
    });
  } else {
    info = readJson((profile.json ?? '/version.json').replace(/^\//, ''));
    // Файлы без ссылки (сам Forge) лежат в maven/ установщика
    for (const lib of info.libraries) {
      const artifact = lib.downloads?.artifact;
      if (artifact && !artifact.url) {
        const path = artifact.path || mavenPath(lib.name);
        copies.push({ from: `maven/${path}`, to: libraryPath(path) });
      }
    }
  }
  // Старые описания ссылаются на прежний адрес Maven Forge
  const libraries: Library[] = info.libraries.map(lib =>
    lib.url && FORGE_OLD_MAVEN.test(lib.url)
      ? { ...lib, url: FORGE_MAVEN }
      : lib,
  );
  return {
    json: { ...info, id, inheritsFrom: game, jar: game, libraries },
    copies,
  };
}

/** Forge из установщика: скачать, распаковать, взять описание версии и файлы, которых нет в Maven */
async function installForge(
  host: GameHost,
  id: string,
  game: string,
  version: string,
) {
  const dir = `loaders/forge/${version}`;
  const jar = `${dir}/installer.jar`;
  const unpacked = `${dir}/installer`;
  await host.downloads.download(`forge:${version}`, [
    {
      url: `${FORGE_MAVEN}net/minecraftforge/forge/${version}/forge-${version}-installer.jar`,
      path: jar,
    },
  ]);
  if (!(await host.files.extract(jar, unpacked, []))) {
    throw new Error('forge installer: extract failed');
  }
  const readJson = <T>(path: string): T => {
    const text = host.files.readText(`${unpacked}/${path}`);
    if (!text) {
      throw new Error(`forge installer: no ${path}`);
    }
    return JSON.parse(text) as T;
  };
  const { json, copies } = forgeVersionFrom(
    readJson<ForgeProfile>('install_profile.json'),
    readJson,
    id,
    game,
  );
  if (copies.length) {
    await host.files.copyFiles(
      copies.map(c => `${unpacked}/${c.from}`),
      copies.map(c => c.to),
    );
  }
  host.files.writeText(versionJson(id), JSON.stringify(json));
  host.files.remove(unpacked);
}
