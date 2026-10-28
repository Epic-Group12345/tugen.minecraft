import type { GameHost } from '@tugen/sdk';
import { manifest } from '../manifest';
import { BuildError, BuildRepo } from './builds';
import { loaderVersions } from './loaders';
import { filterVersions, VersionCatalog } from './mojang';
import { buildRoot } from './paths';
import { platformFor } from './platform';
import { LaunchManager } from './runtime';
import {
  SETTINGS_KEY,
  isValidNickname,
  loadSettings,
  memoryRange,
  normalizeSettings,
} from './settings';
import type { Build, MinecraftCore } from './types';

// Ядро Minecraft: настройки, сборки, версии и запуск поверх GameHost из @tugen/sdk. Ничего из
// лаунчера, нативных модулей и fetch — только host: так мини-приложение работает и в песочнице.
// UI подписывается через subscribe (react.tsx); снимки (настройки, список сборок, состояние
// запуска) — стабильные ссылки до следующего изменения, иначе useSyncExternalStore зациклится

export type {
  Build,
  LaunchErrorCode,
  LaunchPhase,
  LaunchState,
  Loader,
  McSettings,
  McVersion,
  MinecraftCore,
  ModLoader,
} from './types';
export { BuildError } from './builds';

export function createMinecraft(host: GameHost): MinecraftCore {
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach(listener => listener());

  const totalMb = () => host.system.totalMemoryMb();
  let settings = loadSettings(
    host.storage.get<unknown>(SETTINGS_KEY, null),
    totalMb(),
  );

  const platform = platformFor(host.system.os, host.system.arch);
  const versions = new VersionCatalog(host);
  const builds = new BuildRepo(host, emit);
  const runtime = new LaunchManager({
    host,
    context: { host, platform, versions, launcherVersion: manifest.version },
    findBuild: id => builds.find(id),
    updateBuild: (id, patch) => builds.update(id, patch),
    getSettings: () => settings,
    onChange: emit,
  });

  return {
    getSettings: () => settings,
    setSettings: patch => {
      const next = normalizeSettings(settings, patch, totalMb());
      const changed = (Object.keys(next) as (keyof typeof next)[]).some(
        key => next[key] !== settings[key],
      );
      if (changed) {
        settings = next;
        host.storage.set(SETTINGS_KEY, next);
        emit();
      }
    },
    memoryRange: () => memoryRange(totalMb()),
    isValidNickname,

    // Массив не копируем: та же ссылка до изменения — снимок для useSyncExternalStore
    listBuilds: () => builds.builds as Build[],
    createBuild: input => builds.create(input),
    removeBuild: id => {
      // Папку запущенной игры не удалить (файлы заняты), а готовящаяся пишет в неё прямо сейчас
      if (runtime.isBusy(id)) {
        throw new BuildError('running', id);
      }
      builds.remove(id);
      runtime.forget(id);
    },
    getMainBuildId: () => builds.mainId,
    setMainBuild: id => builds.setMain(id),

    listVersions: async (includeSnapshots = false) =>
      filterVersions((await versions.load()).versions, includeSnapshots),
    listLoaderVersions: (loader, mcVersion) =>
      loaderVersions(host, loader, mcVersion),

    launch: buildId => runtime.launch(buildId),
    stop: buildId => runtime.stop(buildId),
    getLaunchState: buildId => runtime.get(buildId),

    openBuildFolder: buildId => {
      if (builds.find(buildId)) {
        host.files.openFolder(buildRoot(buildId));
      }
    },

    subscribe: listener => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
