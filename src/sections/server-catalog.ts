import type { StringKey } from '../i18n';

export const CATEGORY_FALLBACK: string[] = [
  'SURVIVAL',
  'VANILLA',
  'MMORPG',
  'ONEBLOCK',
  'ANARCHY',
  'MINIGAMES',
  'OTHER',
  'CREATIVE',
  'SKYBLOCK',
  'ROLEPLAY',
  'RP',
  'TECHNIC',
  'TECHNICAL',
  'PVP',
  'BOXPVP',
  'KITPVP',
  'ADVENTURE',
  'ECONOMY',
  'FACTIONS',
  'HARDCORE',
  'MODDED',
  'PARKOUR',
  'GRIEF',
  'HIDE_SEEK',
  'BEDWARS',
  'SKYWARS',
  'HUNGER_GAMES',
  'PRISON',
  'BUILD_BATTLE',
  'LUCKY',
  'MURDER',
  'SPLEEF',
  'TNTRUN',
  'UHC',
  'TOWNY',
  'LIFESTEAL',
  'COBBLEMON',
  'EARTH',
  'MANHUNT',
  'BINGO',
];

export const SORT_OPTIONS = ['rating', 'online', 'name', 'new'] as const;
export const LICENSE_OPTIONS = ['', 'CRACKED', 'LICENSE'] as const;
export const ONLINE_OPTIONS = ['', 'live', '20', '100'] as const;
export const PAY_TO_WIN_SLUGS = new Set([
  'hypego',
  'migosmc-net',
  'hyperempires',
  'fantasybox-boxpvp',
  'meow',
]);

const serverMetaLabels: Partial<Record<string, StringKey>> = {
  JAVA: 'servers.edition.java',
  BEDROCK: 'servers.edition.bedrock',
  BOTH: 'servers.edition.both',
  PLUGINS: 'servers.kind.plugins',
  MODDED: 'servers.kind.modded',
  VANILLA: 'servers.kind.vanilla',
  OPEN: 'servers.access.open',
  APPLICATION: 'servers.access.application',
  LAUNCHER: 'servers.access.launcher',
  WHITELIST: 'servers.access.whitelist',
};

const categoryLabels: Partial<Record<string, StringKey>> = {
  SURVIVAL: 'servers.category.survival',
  VANILLA: 'servers.category.vanilla',
  MMORPG: 'servers.category.mmorpg',
  ONEBLOCK: 'servers.category.oneblock',
  ANARCHY: 'servers.category.anarchy',
  MINIGAMES: 'servers.category.minigames',
  OTHER: 'servers.category.other',
  CREATIVE: 'servers.category.creative',
  SKYBLOCK: 'servers.category.skyblock',
  ROLEPLAY: 'servers.category.roleplay',
  RP: 'servers.category.rp',
  TECHNIC: 'servers.category.technic',
  TECHNICAL: 'servers.category.technical',
  PVP: 'servers.category.pvp',
  BOXPVP: 'servers.category.boxpvp',
  KITPVP: 'servers.category.kitpvp',
  ADVENTURE: 'servers.category.adventure',
  ECONOMY: 'servers.category.economy',
  FACTIONS: 'servers.category.factions',
  HARDCORE: 'servers.category.hardcore',
  MODDED: 'servers.category.modded',
  PARKOUR: 'servers.category.parkour',
  GRIEF: 'servers.category.grief',
  HIDE_SEEK: 'servers.category.hideSeek',
  BEDWARS: 'servers.category.bedwars',
  SKYWARS: 'servers.category.skywars',
  HUNGER_GAMES: 'servers.category.hungerGames',
  PRISON: 'servers.category.prison',
  BUILD_BATTLE: 'servers.category.buildBattle',
  LUCKY: 'servers.category.lucky',
  MURDER: 'servers.category.murder',
  SPLEEF: 'servers.category.spleef',
  TNTRUN: 'servers.category.tntRun',
  UHC: 'servers.category.uhc',
  TOWNY: 'servers.category.towny',
  LIFESTEAL: 'servers.category.lifesteal',
  COBBLEMON: 'servers.category.cobblemon',
  EARTH: 'servers.category.earth',
  MANHUNT: 'servers.category.manhunt',
  BINGO: 'servers.category.bingo',
};

const title = (
  code: string,
  labels: Partial<Record<string, StringKey>>,
  tr: (key: StringKey) => string,
) => {
  const label = labels[code];
  return label ? tr(label) : code.toLocaleLowerCase().replaceAll('_', ' ');
};

export const categoryTitle = (
  code: string,
  tr: (key: StringKey) => string,
): string => title(code, categoryLabels, tr);

export const serverMetaTitle = (
  code: string,
  tr: (key: StringKey) => string,
): string => title(code, serverMetaLabels, tr);
