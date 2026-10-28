import type { GameHost } from '@tugen/sdk';
import { MANIFEST_CACHE } from './paths';
import type { McVersion } from './types';

// Все версии Minecraft из манифеста Mojang. Манифест сохраняется в папке игры: без сети список
// берётся оттуда, и сборку из уже известной версии можно подготовить и запустить. Файл кэша тот
// же, что у лаунчера, — его манифест годится и нам

export const VERSION_MANIFEST =
  'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';

const TYPES: readonly McVersion['type'][] = [
  'release',
  'snapshot',
  'old_beta',
  'old_alpha',
];

export interface VersionEntry extends McVersion {
  /** Описание версии (versions/<id>/<id>.json) */
  url: string;
  sha1: string;
}

export interface Manifest {
  latest: { release: string; snapshot: string } | null;
  versions: VersionEntry[];
}

const isString = (v: unknown): v is string => typeof v === 'string' && !!v;

/** Текст манифеста → проверенный список: записи без id, адреса или с чужим типом пропускаются */
export function parseManifest(text: string): Manifest | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') {
    return null;
  }
  const raw = data as { latest?: unknown; versions?: unknown };
  if (!Array.isArray(raw.versions)) {
    return null;
  }
  const versions: VersionEntry[] = [];
  for (const item of raw.versions) {
    const v = (item ?? {}) as Record<string, unknown>;
    const type = v.type as McVersion['type'];
    if (isString(v.id) && isString(v.url) && TYPES.includes(type)) {
      versions.push({
        id: v.id,
        type,
        url: v.url,
        sha1: typeof v.sha1 === 'string' ? v.sha1 : '',
        releaseTime: typeof v.releaseTime === 'string' ? v.releaseTime : '',
      });
    }
  }
  const latest = raw.latest as Record<string, unknown> | undefined;
  return {
    versions,
    latest:
      latest && isString(latest.release) && isString(latest.snapshot)
        ? { release: latest.release, snapshot: latest.snapshot }
        : null,
  };
}

/**
 * Версии для выбора: релизы всегда; со снапшотами — и всё остальное (снапшоты, старые бета и
 * альфа). Порядок манифеста — от новых к старым
 */
export function filterVersions(
  versions: readonly VersionEntry[],
  includeSnapshots: boolean,
): McVersion[] {
  return versions
    .filter(v => includeSnapshots || v.type === 'release')
    .map(({ id, type, releaseTime }) => ({ id, type, releaseTime }));
}

/** Манифест из сети, без сети — из кэша; загруженный держится в памяти до конца сеанса */
export class VersionCatalog {
  private manifest: Manifest | null = null;
  private pending: Promise<Manifest> | null = null;

  constructor(private host: GameHost) {}

  load(): Promise<Manifest> {
    if (this.manifest) {
      return Promise.resolve(this.manifest);
    }
    if (!this.pending) {
      this.pending = this.fetch().finally(() => {
        this.pending = null;
      });
    }
    return this.pending;
  }

  private async fetch(): Promise<Manifest> {
    let networkError: unknown;
    try {
      const text = await this.host.net.fetchText(VERSION_MANIFEST);
      const manifest = parseManifest(text);
      if (manifest) {
        this.host.files.writeText(MANIFEST_CACHE, text);
        this.manifest = manifest;
        return manifest;
      }
      networkError = new Error('bad version manifest');
    } catch (e) {
      networkError = e;
    }
    const cached = this.host.files.readText(MANIFEST_CACHE);
    const manifest = cached ? parseManifest(cached) : null;
    if (!manifest) {
      throw networkError;
    }
    // Кэш не запоминаем навсегда: следующий запрос снова попробует сеть
    return manifest;
  }

  async find(id: string): Promise<VersionEntry | undefined> {
    return (await this.load()).versions.find(v => v.id === id);
  }
}
