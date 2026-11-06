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

  // Серверы
  'servers.title': { ru: 'Серверы', en: 'Servers' },
  'servers.subtitle': {
    ru: 'Каталог Minecraft',
    en: 'Minecraft server catalogue',
  },
  'servers.count': { ru: 'Серверов: {count}', en: 'Servers: {count}' },
  'servers.showFilters': { ru: 'Фильтры', en: 'Filters' },
  'servers.hideFilters': { ru: 'Скрыть фильтры', en: 'Hide filters' },
  'servers.resetFilters': { ru: 'Сбросить', en: 'Reset' },
  'servers.filterCategory': { ru: 'Режим', en: 'Category' },
  'servers.filterSort': { ru: 'Сортировка', en: 'Sort' },
  'servers.filterLicense': { ru: 'Лицензия', en: 'License' },
  'servers.filterOnline': { ru: 'Онлайн', en: 'Online' },
  'servers.filterVersion': { ru: 'Версия', en: 'Version' },
  'servers.allCategories': { ru: 'Все режимы', en: 'All categories' },
  'servers.anyVersion': { ru: 'Любая версия', en: 'Any version' },
  'servers.showOffline': {
    ru: 'Показывать офлайн-серверы',
    en: 'Show offline servers',
  },
  'servers.hidePayToWin': {
    ru: 'Скрывать серверы с Pay2Win',
    en: 'Hide Pay2Win servers',
  },
  'servers.pay2winBadge': { ru: 'Pay2Win', en: 'Pay2Win' },
  'servers.allOffline': {
    ru: 'В списке только офлайн-серверы. Включите их показ в фильтрах.',
    en: 'Only offline servers are in this list. Enable them in filters.',
  },
  'servers.filteredOut': {
    ru: 'Серверы не подходят под выбранные фильтры.',
    en: 'No servers match the selected filters.',
  },
  'servers.category.survival': { ru: 'Выживание', en: 'Survival' },
  'servers.category.vanilla': { ru: 'Ванилла', en: 'Vanilla' },
  'servers.category.mmorpg': { ru: 'РПГ', en: 'RPG' },
  'servers.category.oneblock': { ru: 'OneBlock', en: 'OneBlock' },
  'servers.category.anarchy': { ru: 'Анархия', en: 'Anarchy' },
  'servers.category.minigames': { ru: 'Мини-игры', en: 'Minigames' },
  'servers.category.other': { ru: 'Разное', en: 'Other' },
  'servers.category.creative': { ru: 'Креатив', en: 'Creative' },
  'servers.category.skyblock': { ru: 'SkyBlock', en: 'SkyBlock' },
  'servers.category.roleplay': { ru: 'RP', en: 'RP' },
  'servers.category.rp': { ru: 'RP', en: 'RP' },
  'servers.category.technic': { ru: 'Техно', en: 'Tech' },
  'servers.category.technical': { ru: 'Техно', en: 'Tech' },
  'servers.category.pvp': { ru: 'PvP', en: 'PvP' },
  'servers.category.boxpvp': { ru: 'BoxPvP', en: 'BoxPvP' },
  'servers.category.kitpvp': { ru: 'KitPvP', en: 'KitPvP' },
  'servers.category.adventure': { ru: 'Приключения', en: 'Adventure' },
  'servers.category.economy': { ru: 'Экономика', en: 'Economy' },
  'servers.category.factions': { ru: 'Фракции', en: 'Factions' },
  'servers.category.hardcore': { ru: 'Хардкор', en: 'Hardcore' },
  'servers.category.modded': { ru: 'Моды', en: 'Modded' },
  'servers.category.parkour': { ru: 'Паркур', en: 'Parkour' },
  'servers.category.grief': { ru: 'Гриферство', en: 'Griefing' },
  'servers.category.hideSeek': { ru: 'Прятки', en: 'Hide and Seek' },
  'servers.category.bedwars': { ru: 'BedWars', en: 'BedWars' },
  'servers.category.skywars': { ru: 'SkyWars', en: 'SkyWars' },
  'servers.category.hungerGames': {
    ru: 'Голодные игры',
    en: 'Hunger Games',
  },
  'servers.category.prison': { ru: 'Тюрьма', en: 'Prison' },
  'servers.category.buildBattle': {
    ru: 'Битва строителей',
    en: 'Build Battle',
  },
  'servers.category.lucky': { ru: 'Лаки-блоки', en: 'Lucky Blocks' },
  'servers.category.murder': { ru: 'Мардер', en: 'Murder Mystery' },
  'servers.category.spleef': { ru: 'Сплиф', en: 'Spleef' },
  'servers.category.tntRun': { ru: 'TNT Run', en: 'TNT Run' },
  'servers.category.uhc': { ru: 'UHC', en: 'UHC' },
  'servers.category.towny': { ru: 'Towny', en: 'Towny' },
  'servers.category.lifesteal': { ru: 'Lifesteal', en: 'Lifesteal' },
  'servers.category.cobblemon': { ru: 'Cobblemon', en: 'Cobblemon' },
  'servers.category.earth': { ru: 'Земля', en: 'Earth' },
  'servers.category.manhunt': {
    ru: 'Охота на человека',
    en: 'Manhunt',
  },
  'servers.category.bingo': { ru: 'Бинго', en: 'Bingo' },
  'servers.filterOptionsFallback': {
    ru: 'Не удалось загрузить варианты фильтров; показаны стандартные.',
    en: 'Could not load filter options; showing defaults.',
  },
  'servers.sort.rating': { ru: 'По рейтингу', en: 'Rating' },
  'servers.sort.online': { ru: 'По онлайну', en: 'Online' },
  'servers.sort.name': { ru: 'По названию', en: 'Name' },
  'servers.sort.new': { ru: 'Сначала новые', en: 'Newest' },
  'servers.license.any': { ru: 'Любая', en: 'Any' },
  'servers.license.cracked': { ru: 'Без лицензии', en: 'Cracked' },
  'servers.license.license': { ru: 'С лицензией', en: 'Licensed' },
  'servers.online.any': { ru: 'Любой онлайн', en: 'Any online' },
  'servers.online.live': { ru: 'Сейчас онлайн', en: 'Online now' },
  'servers.online.from20': { ru: 'От 20 игроков', en: '20+ players' },
  'servers.online.from100': { ru: 'От 100 игроков', en: '100+ players' },
  'servers.crackedBadge': { ru: 'Без лицензии', en: 'Cracked' },
  'servers.newBadge': { ru: 'Новый', en: 'New' },
  'servers.boosted': { ru: 'Продвигается', en: 'Promoted' },
  'servers.avgOnline': {
    ru: 'Обычно онлайн: {count}',
    en: 'Average online: {count}',
  },
  'servers.votes': {
    ru: 'Голосов за месяц: {count}',
    en: 'Votes this month: {count}',
  },
  'servers.edition.java': { ru: 'Java', en: 'Java' },
  'servers.edition.bedrock': { ru: 'Bedrock', en: 'Bedrock' },
  'servers.edition.both': { ru: 'Java и Bedrock', en: 'Java and Bedrock' },
  'servers.kind.plugins': { ru: 'Плагины', en: 'Plugins' },
  'servers.kind.modded': { ru: 'Моды', en: 'Modded' },
  'servers.kind.vanilla': { ru: 'Ванилла', en: 'Vanilla' },
  'servers.access.open': { ru: 'Свободный вход', en: 'Open to everyone' },
  'servers.access.application': {
    ru: 'Вход по заявке',
    en: 'By application',
  },
  'servers.access.launcher': {
    ru: 'Через свой лаунчер',
    en: 'Via its own launcher',
  },
  'servers.access.whitelist': { ru: 'Белый список', en: 'Whitelist' },
  'servers.refresh': { ru: 'Обновить', en: 'Refresh' },
  'servers.search': { ru: 'Поиск серверов', en: 'Search servers' },
  'servers.searchHint': { ru: 'Название или адрес', en: 'Name or address' },
  'servers.playWith': {
    ru: 'Запускать на сервере со сборкой',
    en: 'Join with build',
  },
  'servers.buildRequired': {
    ru: 'Создайте сборку, чтобы подключаться к серверам',
    en: 'Create a build to join servers',
  },
  'servers.loading': { ru: 'Загружаем каталог…', en: 'Loading catalogue…' },
  'servers.loadFailed': {
    ru: 'Не удалось загрузить каталог: {error}',
    en: 'Could not load catalogue: {error}',
  },
  'servers.tryAgain': { ru: 'Повторить', en: 'Try again' },
  'servers.empty': { ru: 'Серверы не найдены', en: 'No servers found' },
  'servers.more': { ru: 'Показать ещё', en: 'Load more' },
  'servers.online': { ru: 'В сети · {count}', en: 'Online · {count}' },
  'servers.offline': { ru: 'Офлайн', en: 'Offline' },
  'servers.address': { ru: 'Адрес', en: 'Address' },
  'servers.addressUnknown': {
    ru: 'Адрес не указан',
    en: 'Address unavailable',
  },
  'servers.join': {
    ru: 'Запустить Minecraft и подключиться к серверу «{name}»',
    en: 'Launch Minecraft and join “{name}”',
  },
  'servers.openShort': { ru: 'Открыть', en: 'Open' },

  // Сборки
  buildCount: { ru: 'Сборок: {count}', en: 'Builds: {count}' },
  builds: { ru: 'Сборки', en: 'Builds' },
  main: { ru: 'Основная', en: 'Main' },
  makeMain: { ru: 'Сделать основной', en: 'Make main' },
  folder: { ru: 'Папка', en: 'Folder' },
  buildActions: { ru: 'Действия со сборкой', en: 'Build actions' },
  buildRename: { ru: 'Переименовать', en: 'Rename' },
  buildDuplicate: { ru: 'Создать копию', en: 'Duplicate' },
  buildDuplicating: { ru: 'Копируем…', en: 'Copying…' },
  buildNameRequired: {
    ru: 'Введите название сборки.',
    en: 'Enter a build name.',
  },
  buildCopyFailed: {
    ru: 'Не удалось создать копию сборки.',
    en: 'Could not duplicate the build.',
  },
  buildCopySucceeded: {
    ru: 'Создана копия «{name}».',
    en: 'Created a copy of “{name}”.',
  },
  buildCopyInProgress: {
    ru: 'Дождитесь окончания копирования сборки.',
    en: 'Wait for the build copy to finish.',
  },
  buildNotFound: {
    ru: 'Сборка больше не существует.',
    en: 'This build no longer exists.',
  },
  buildBusy: {
    ru: 'Остановите игру, чтобы выполнить это действие.',
    en: 'Stop the game before performing this action.',
  },
  buildActionFailed: {
    ru: 'Не удалось выполнить действие: {error}',
    en: 'Could not complete the action: {error}',
  },
  buildFolder: { ru: 'Папка сборки', en: 'Build folder' },
  'buildFolder.saves': { ru: 'Миры', en: 'Worlds' },
  'buildFolder.mods': { ru: 'Моды', en: 'Mods' },
  'buildFolder.resourcepacks': {
    ru: 'Наборы ресурсов',
    en: 'Resource packs',
  },
  'buildFolder.shaderpacks': { ru: 'Шейдеры', en: 'Shaders' },
  'buildFolder.screenshots': { ru: 'Скриншоты', en: 'Screenshots' },
  'buildFolder.logs': { ru: 'Журналы', en: 'Logs' },
  remove: { ru: 'Удалить', en: 'Delete' },
  save: { ru: 'Сохранить', en: 'Save' },
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
  'settings.player': { ru: 'ИГРОК', en: 'PLAYER' },
  'settings.performance': { ru: 'ПРОИЗВОДИТЕЛЬНОСТЬ', en: 'PERFORMANCE' },
  'settings.launch': { ru: 'ЗАПУСК', en: 'LAUNCH' },
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
