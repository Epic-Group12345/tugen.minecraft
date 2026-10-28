import { localize, useHost, type LocalizedText } from '@tugen/sdk';
import { useCallback } from 'react';

// Свои строки пакета: у лаунчера словарь свой, и до строк мини-приложения он не дотягивается.
// Подстановки — {name} в тексте
const strings = {
  sectionsLabel: { ru: 'Разделы Minecraft', en: 'Minecraft sections' },
  soon: { ru: 'Скоро здесь будет', en: 'Coming soon' },
  mb: { ru: 'МБ', en: 'MB' },

  // Обзор
  mainBuild: { ru: 'Основная сборка', en: 'Main build' },
  noBuilds: { ru: 'Сборок пока нет', en: 'No builds yet' },
  noBuildsHint: {
    ru: 'Создайте сборку: выберите версию игры и загрузчик модов',
    en: 'Create a build: pick a game version and a mod loader',
  },
  createBuild: { ru: 'Создать сборку', en: 'Create build' },
  play: { ru: 'Играть', en: 'Play' },
  stop: { ru: 'Остановить', en: 'Stop' },
  'phase.preparing': { ru: 'Подготовка', en: 'Preparing' },
  'phase.downloading': { ru: 'Загрузка файлов', en: 'Downloading files' },
  'phase.starting': { ru: 'Запуск игры', en: 'Starting the game' },
  'phase.running': { ru: 'Игра запущена', en: 'The game is running' },
  'phase.failed': { ru: 'Не удалось запустить', en: 'Failed to launch' },
  progress: { ru: '{done} из {total}', en: '{done} of {total}' },
  log: { ru: 'Журнал', en: 'Log' },
  showLog: { ru: 'Развернуть', en: 'Expand' },
  hideLog: { ru: 'Свернуть', en: 'Collapse' },
  logEmpty: { ru: 'Журнал пуст', en: 'The log is empty' },

  // Сборки
  builds: { ru: 'Сборки', en: 'Builds' },
  main: { ru: 'Основная', en: 'Main' },
  makeMain: { ru: 'Сделать основной', en: 'Make main' },
  folder: { ru: 'Папка', en: 'Folder' },
  remove: { ru: 'Удалить', en: 'Delete' },
  removeConfirm: {
    ru: 'Удалить сборку «{name}» вместе с её файлами?',
    en: 'Delete the build “{name}” with its files?',
  },
  cancel: { ru: 'Отмена', en: 'Cancel' },
  newBuild: { ru: 'Новая сборка', en: 'New build' },
  buildName: { ru: 'Название', en: 'Name' },
  buildNameHint: {
    ru: 'Пусто — назовём по версии',
    en: 'Leave empty to name it after the version',
  },
  version: { ru: 'Версия игры', en: 'Game version' },
  versionSearch: { ru: 'Найти версию', en: 'Find a version' },
  snapshots: { ru: 'Снапшоты', en: 'Snapshots' },
  moreVersions: {
    ru: 'И ещё {count} — уточните поиск',
    en: '{count} more — refine the search',
  },
  noVersions: { ru: 'Ничего не нашлось', en: 'Nothing found' },
  loader: { ru: 'Загрузчик', en: 'Loader' },
  loaderVersion: { ru: 'Версия загрузчика', en: 'Loader version' },
  pickVersionFirst: {
    ru: 'Сначала выберите версию игры',
    en: 'Pick a game version first',
  },
  noLoaderVersions: {
    ru: 'Для этой версии игры загрузчика нет',
    en: 'No loader for this game version',
  },
  loaderLatest: { ru: 'Последняя', en: 'Latest' },
  loaderLatestHint: {
    ru: 'возьмём при первом запуске',
    en: 'picked on first launch',
  },
  loading: { ru: 'Загрузка…', en: 'Loading…' },
  loadFailed: {
    ru: 'Не удалось загрузить: {error}',
    en: 'Failed to load: {error}',
  },
  create: { ru: 'Создать', en: 'Create' },

  // Настройки
  settings: { ru: 'Настройки', en: 'Settings' },
  nickname: { ru: 'Ник', en: 'Nickname' },
  nicknameInvalid: {
    ru: 'От 3 до 16 символов: латиница, цифры и _',
    en: '3 to 16 characters: Latin letters, digits and _',
  },
  memory: { ru: 'Память для игры', en: 'Memory for the game' },
  memoryHint: {
    ru: 'Можно от {min} до {max} МБ, рекомендуем {recommended} МБ',
    en: 'From {min} to {max} MB, {recommended} MB recommended',
  },
  memoryLess: { ru: 'Меньше памяти', en: 'Less memory' },
  memoryMore: { ru: 'Больше памяти', en: 'More memory' },
  recommended: { ru: 'Рекомендуемое', en: 'Recommended' },
  jvmArgs: { ru: 'Аргументы JVM', en: 'JVM arguments' },
  jvmArgsHint: {
    ru: 'Через пробел, например -XX:+UseG1GC',
    en: 'Space-separated, e.g. -XX:+UseG1GC',
  },
  windowSize: { ru: 'Размер окна игры', en: 'Game window size' },
  windowWidth: { ru: 'Ширина', en: 'Width' },
  windowHeight: { ru: 'Высота', en: 'Height' },
  windowHint: {
    ru: 'Пусто или 0 — размер выберет сама игра',
    en: 'Empty or 0 lets the game choose',
  },
  windowInvalid: {
    ru: 'Нужно целое число пикселей',
    en: 'Must be a whole number of pixels',
  },

  // Ошибки запуска — коды LaunchErrorCode ядра
  'error.nickname': {
    ru: 'Ник не подходит — исправьте его в настройках',
    en: 'The nickname is invalid — fix it in settings',
  },
  'error.version': {
    ru: 'Не удалось получить описание версии игры',
    en: 'Could not get the game version description',
  },
  'error.loader': {
    ru: 'Не удалось установить загрузчик модов',
    en: 'Could not install the mod loader',
  },
  'error.network': {
    ru: 'Нет связи с серверами загрузки',
    en: 'Cannot reach the download servers',
  },
  'error.files': {
    ru: 'Не удалось скачать или проверить файлы игры',
    en: 'Could not download or verify the game files',
  },
  'error.natives': {
    ru: 'Не удалось распаковать нативные библиотеки',
    en: 'Could not unpack native libraries',
  },
  'error.java': {
    ru: 'Не удалось подготовить Java',
    en: 'Could not set up Java',
  },
  'error.start': { ru: 'Игра не запустилась', en: 'The game did not start' },
  'error.crash': { ru: 'Игра завершилась с ошибкой', en: 'The game crashed' },
  'error.unknown': {
    ru: 'Неизвестная ошибка: {error}',
    en: 'Unknown error: {error}',
  },
  errorLogHint: {
    ru: 'Подробности — в журнале ниже',
    en: 'See the log below for details',
  },
} satisfies Record<string, LocalizedText>;

// Что появится в разделе — для заглушек, пока экраны не переехали из лаунчера
export const upcoming: Record<string, LocalizedText> = {
  servers: { ru: 'список серверов', en: 'a server list' },
  content: { ru: 'моды и другой контент', en: 'mods and other content' },
  skins: { ru: 'смена скина', en: 'skin changer' },
};

export type StringKey = keyof typeof strings;
export type Vars = Record<string, string | number>;

export const t = (key: StringKey, locale: string, vars?: Vars): string => {
  const text = localize(strings[key], locale);
  return vars
    ? text.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match,
      )
    : text;
};

/** Переводчик на язык лаунчера */
export function useT() {
  const locale = useHost().system.locale;
  return useCallback(
    (key: StringKey, vars?: Vars) => t(key, locale, vars),
    [locale],
  );
}
