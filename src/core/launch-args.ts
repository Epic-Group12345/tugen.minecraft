import { offlineUuid } from './offline';
import { libraryPath, logConfigPath, versionJar } from './paths';
import type { GamePlatform } from './platform';
import { MEMORY_START_MB } from './settings';
import type { McSettings } from './types';
import {
  expand,
  gameArguments,
  jvmArguments,
  splitArgs,
  type Features,
  type ResolvedLibraries,
  type VersionJson,
} from './version';

// Команда запуска java — чистая функция: всё, что лежит на диске, уже подготовлено (prepare.ts),
// здесь только аргументы. Отдельно от подготовки, чтобы её проверяли тесты без файлов и сети

export const LAUNCHER_NAME = 'TUGEN';

export interface LaunchArgsInput {
  version: VersionJson;
  libraries: ResolvedLibraries;
  platform: GamePlatform;
  settings: McSettings;
  launcherVersion: string;
  /** Пути внутри пространства игры */
  gameDir: string;
  natives: string;
  /** Папка ассетов для игры: assets, у старых версий — виртуальная */
  gameAssets: string;
  assetsId: string;
  /** Путь внутри пространства → путь на диске (host.files.absolutePath) */
  absolute: (path: string) => string;
}

/** Своё разрешение окна — только когда заданы обе стороны */
export const launchFeatures = (settings: McSettings): Features => ({
  has_custom_resolution: settings.windowWidth > 0 && settings.windowHeight > 0,
});

export function launchArgs(input: LaunchArgsInput): string[] {
  const { version, libraries, platform, settings, absolute } = input;
  const features = launchFeatures(settings);
  const jarId = version.jar ?? version.id;
  const classpath = [
    ...libraries.classpath.map(l => absolute(libraryPath(l.path))),
    absolute(versionJar(jarId)),
  ];
  const vars: Record<string, string> = {
    auth_player_name: settings.nickname,
    auth_uuid: offlineUuid(settings.nickname).replace(/-/g, ''),
    // Офлайн-игрок: токена нет, игра принимает любой непустой
    auth_access_token: '0',
    auth_session: '0',
    auth_xuid: '',
    clientid: '',
    user_type: 'legacy',
    user_properties: '{}',
    version_name: version.id,
    version_type: version.type,
    game_directory: absolute(input.gameDir),
    assets_root: absolute('assets'),
    game_assets: absolute(input.gameAssets),
    assets_index_name: input.assetsId,
    natives_directory: absolute(input.natives),
    library_directory: absolute('libraries'),
    classpath: classpath.join(platform.classpathSeparator),
    classpath_separator: platform.classpathSeparator,
    launcher_name: LAUNCHER_NAME,
    launcher_version: input.launcherVersion,
    resolution_width: String(settings.windowWidth),
    resolution_height: String(settings.windowHeight),
  };
  const log = version.logging?.client;
  const memoryMax = settings.memoryMb;
  return [
    `-Xms${Math.min(MEMORY_START_MB, memoryMax)}M`,
    `-Xmx${memoryMax}M`,
    // Вывод игры — в UTF-8, иначе русский текст в журнале придёт в кодировке консоли
    '-Dsun.stdout.encoding=UTF-8',
    '-Dsun.stderr.encoding=UTF-8',
    '-Dstdout.encoding=UTF-8',
    '-Dstderr.encoding=UTF-8',
    ...splitArgs(settings.jvmArgs),
    ...jvmArguments(version, vars, platform, features),
    // Настройка журнала от Mojang: события XML (их разбирает журнал) и закрытая уязвимость log4j
    ...(log
      ? [expand(log.argument, { path: absolute(logConfigPath(log.file.id)) })]
      : []),
    version.mainClass,
    ...gameArguments(version, vars, platform, features),
  ];
}
