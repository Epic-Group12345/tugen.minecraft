import type { ServerTarget } from './types';

export interface MinecraftServer {
  slug: string;
  name: string;
  rank: number;
  address: string;
  target: ServerTarget | null;
  online: number;
  averageOnline: number;
  isOnline: boolean;
  description: string;
  motd: string;
  version: string;
  versionSpan: string;
  versions: string[];
  category: string;
  modes: string[];
  edition: string;
  kind: string;
  access: string;
  logo: string | null;
  banner: string | null;
  cracked: boolean;
  isNew: boolean;
  boost: number;
  votes: number;
}

export interface MinecraftServerPage {
  servers: MinecraftServer[];
  total: number;
  count: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const validPort = (value: unknown): number | null => {
  const port =
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  return typeof port === 'number' &&
    Number.isInteger(port) &&
    port > 0 &&
    port <= 65535
    ? port
    : null;
};

const validIpv6 = (value: string): boolean => {
  if (
    !/^[\da-f:]+$/i.test(value) ||
    !value.includes(':') ||
    value.includes(':::') ||
    (value.match(/::/g)?.length ?? 0) > 1
  ) {
    return false;
  }
  const groups = value.split(':').filter(Boolean);
  if (groups.some(group => group.length > 4)) {
    return false;
  }
  return value.includes('::') ? groups.length < 8 : groups.length === 8;
};

const validHostname = (value: string): boolean =>
  value.length <= 253 &&
  value
    .split('.')
    .every(
      label =>
        label.length > 0 &&
        label.length <= 63 &&
        /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(label),
    );

/** Разбирает адрес из каталога, не позволяя передать в аргументы игры лишние параметры. */
export function parseServerTarget(
  value: unknown,
  fallbackPort?: unknown,
): ServerTarget | null {
  if (typeof value !== 'string') {
    return null;
  }
  let address = value.trim();
  if (
    !address ||
    address.length > 260 ||
    /\s/.test(address) ||
    [...address].some(character => character.charCodeAt(0) <= 0x1f)
  ) {
    return null;
  }

  let inlinePort: number | null = null;
  if (address.startsWith('[')) {
    const match = /^\[([\da-f:]+)\](?::(\d{1,5}))?$/i.exec(address);
    if (!match || !validIpv6(match[1])) {
      return null;
    }
    address = match[1];
    inlinePort = match[2] ? validPort(match[2]) : null;
    if (match[2] && inlinePort === null) {
      return null;
    }
  } else {
    const colon = address.lastIndexOf(':');
    if (colon >= 0 && address.indexOf(':') !== colon) {
      if (!validIpv6(address)) {
        return null;
      }
    } else if (colon >= 0) {
      if (address.indexOf(':') !== colon) {
        return null;
      }
      const portText = address.slice(colon + 1);
      inlinePort = validPort(portText);
      if (inlinePort === null) {
        return null;
      }
      address = address.slice(0, colon);
    }
    if (!validIpv6(address) && !validHostname(address)) {
      return null;
    }
  }

  const port =
    inlinePort ??
    (fallbackPort === undefined || fallbackPort === null || fallbackPort === ''
      ? 25565
      : validPort(fallbackPort));
  return port === null ? null : { address, port };
}

const serverFrom = (value: unknown, rank: number): MinecraftServer | null => {
  if (
    !isRecord(value) ||
    typeof value.name !== 'string' ||
    typeof value.slug !== 'string'
  ) {
    return null;
  }
  const ip =
    typeof value.ip === 'string' && value.ip
      ? value.ip
      : typeof value.address === 'string'
      ? value.address
      : '';
  const target = parseServerTarget(ip, value.port);
  const address = target
    ? `${
        target.address.includes(':') ? `[${target.address}]` : target.address
      }:${target.port}`
    : ip.slice(0, 260);
  const onlineValue = value.online ?? value.avgOnline;
  const online =
    typeof onlineValue === 'number' && Number.isFinite(onlineValue)
      ? Math.max(0, Math.floor(onlineValue))
      : 0;
  const category =
    Array.isArray(value.categories) && typeof value.categories[0] === 'string'
      ? value.categories[0]
      : '';
  const versions = Array.isArray(value.versionMajors)
    ? value.versionMajors
        .filter((version): version is string => typeof version === 'string')
        .slice(0, 20)
    : [];
  const sortedVersions = [...versions].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  const createdAt =
    typeof value.createdAt === 'string' ? Date.parse(value.createdAt) : NaN;
  const now = Date.now();
  const safeImageUrl = (image: unknown): string | null =>
    typeof image === 'string' && image.startsWith('https://')
      ? image.slice(0, 2048)
      : null;
  return {
    slug: value.slug,
    name: value.name.slice(0, 100),
    rank,
    address,
    target,
    online,
    averageOnline:
      typeof value.avgOnline === 'number' && Number.isFinite(value.avgOnline)
        ? Math.max(0, Math.floor(value.avgOnline))
        : 0,
    isOnline: typeof value.isOnline === 'boolean' ? value.isOnline : online > 0,
    description:
      [value.aiTagline, value.shortDesc, value.aiDescription, value.description]
        .find(item => typeof item === 'string' && item.trim())
        ?.toString()
        .replace(/\s+/g, ' ')
        .slice(0, 240) ?? '',
    motd:
      typeof value.motd === 'string'
        ? value.motd.replace(/\s+/g, ' ').slice(0, 120)
        : '',
    version: versions.slice(0, 4).join(', '),
    versionSpan:
      sortedVersions.length > 1
        ? `${sortedVersions[0]} – ${sortedVersions[sortedVersions.length - 1]}`
        : sortedVersions[0] ?? '',
    versions,
    category,
    modes:
      Array.isArray(value.categories) && value.categories.length
        ? value.categories.filter(
            (item): item is string => typeof item === 'string',
          )
        : category
        ? [category]
        : [],
    edition: typeof value.edition === 'string' ? value.edition : '',
    kind: typeof value.kind === 'string' ? value.kind : '',
    access: typeof value.accessType === 'string' ? value.accessType : '',
    logo: safeImageUrl(value.logoUrl),
    banner: safeImageUrl(value.bannerUrl),
    cracked: value.license === 'CRACKED',
    isNew:
      Number.isFinite(createdAt) &&
      now >= createdAt &&
      now - createdAt < 30 * 86400000,
    boost:
      typeof value.boostPoints === 'number' && Number.isFinite(value.boostPoints)
        ? Math.max(0, value.boostPoints)
        : typeof value.boostUnits === 'number' &&
          Number.isFinite(value.boostUnits)
        ? Math.max(0, value.boostUnits)
        : 0,
    votes:
      typeof value.votes30d === 'number' && Number.isFinite(value.votes30d)
        ? Math.max(0, value.votes30d)
        : 0,
  };
};

/** Проверка ответа API на границе мини-приложения. Невалидная оболочка — явная ошибка, не пустой список. */
export function parseServerPage(
  value: unknown,
  offset = 0,
): MinecraftServerPage {
  if (!isRecord(value) || !Array.isArray(value.servers)) {
    throw new Error('В ответе каталога нет списка серверов');
  }
  const servers = value.servers
    .map((server, index) => serverFrom(server, offset + index + 1))
    .filter((server): server is MinecraftServer => server !== null);
  const total =
    typeof value.total === 'number' &&
    Number.isFinite(value.total) &&
    value.total >= 0
      ? Math.floor(value.total)
      : servers.length;
  return { servers, total, count: value.servers.length };
}

export const SERVER_PAGE_SIZE = 24;

export interface ServerFilters {
  category: string;
  sort: string;
  license: string;
  online: string;
  version: string;
}

export const DEFAULT_SERVER_FILTERS: ServerFilters = {
  category: '',
  sort: 'rating',
  license: '',
  online: '',
  version: '',
};

/** Формирует запрос каталога, не включая параметры фильтров, которые не выбраны. */
export function serverPageUrl(
  offset: number,
  query: string,
  filters: ServerFilters,
): string {
  const params = [
    `limit=${SERVER_PAGE_SIZE}`,
    `offset=${Math.max(0, offset)}`,
    `sort=${encodeURIComponent(filters.sort || DEFAULT_SERVER_FILTERS.sort)}`,
  ];
  if (filters.category) {
    params.push(`category=${encodeURIComponent(filters.category)}`);
  }
  if (filters.license) {
    params.push(`license=${encodeURIComponent(filters.license)}`);
  }
  if (filters.version) {
    params.push(`version=${encodeURIComponent(filters.version.slice(0, 16))}`);
  }
  const minOnline =
    filters.online === 'live' ? 1 : Number.parseInt(filters.online, 10);
  if (Number.isFinite(minOnline) && minOnline > 0) {
    params.push(`minOnline=${minOnline}`);
  }
  const search = query.trim().slice(0, 60);
  if (search) params.push(`search=${encodeURIComponent(search)}`);
  return `https://api.millida.net/v2/rating/servers?${params.join('&')}`;
}

/** Защита интерфейса ядра: принимать только адрес и порт после строгой проверки. */
export const isValidServerTarget = (value: ServerTarget): boolean => {
  const parsed = parseServerTarget(value.address, value.port);
  return parsed?.address === value.address && parsed.port === value.port;
};
