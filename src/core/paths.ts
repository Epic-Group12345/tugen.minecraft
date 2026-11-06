// Раскладка папки игры — та же, что у лаунчера (services/game/paths.ts): пространство Minecraft —
// корень папки игр, поэтому версии, библиотеки, ассеты и Java, скачанные старым интерфейсом,
// подхватываются без повторной загрузки. Папка сборки builds/<id> — это и есть папка игры

export const versionJson = (id: string) => `versions/${id}/${id}.json`;
export const versionJar = (id: string) => `versions/${id}/${id}.jar`;
export const libraryPath = (path: string) => `libraries/${path}`;
export const assetIndexPath = (id: string) => `assets/indexes/${id}.json`;
export const assetObject = (hash: string) =>
  `assets/objects/${hash.slice(0, 2)}/${hash}`;
export const logConfigPath = (id: string) => `assets/log_configs/${id}`;

export const buildRoot = (id: string) => `builds/${id}`;
// Распакованные natives — не в папке игры: она папка игрока, а natives пересоздаются при каждом запуске
export const buildNatives = (id: string) => `natives/${id}`;

/** Кэш манифеста версий: без сети список версий берётся отсюда */
export const MANIFEST_CACHE = 'versions/version_manifest_v2.json';
