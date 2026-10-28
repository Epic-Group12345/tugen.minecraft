import { useHost } from '@tugen/sdk';
import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
} from 'react';
import { IDLE } from './runtime';
import { createMinecraft } from './index';
import type { Build, LaunchState, McSettings, MinecraftCore } from './types';

// React-обвязка ядра: одно ядро на мини-приложение (CoreProvider), хуки — через
// useSyncExternalStore. Снимки ядра — стабильные ссылки, поэтому хуки отдают их как есть

const CoreContext = createContext<MinecraftCore | null>(null);

export const CoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const host = useHost();
  // Ядро создаётся один раз: в нём состояние запусков и подписки на процессы игры
  const [core] = useState(() => createMinecraft(host));
  return <CoreContext.Provider value={core}>{children}</CoreContext.Provider>;
};

export function useCore(): MinecraftCore {
  const core = useContext(CoreContext);
  if (!core) {
    throw new Error('Minecraft: useCore() вызван вне CoreProvider');
  }
  return core;
}

function useCoreValue<T>(read: (core: MinecraftCore) => T): T {
  const core = useCore();
  const snapshot = useCallback(() => read(core), [core, read]);
  return useSyncExternalStore(core.subscribe, snapshot, snapshot);
}

const readSettings = (core: MinecraftCore) => core.getSettings();
const readBuilds = (core: MinecraftCore) => core.listBuilds();
const readMain = (core: MinecraftCore) => core.getMainBuildId();

export const useSettings = (): McSettings => useCoreValue(readSettings);

export const useBuilds = (): Build[] => useCoreValue(readBuilds);

export const useMainBuildId = (): string | null => useCoreValue(readMain);

export function useLaunchState(buildId: string | null): LaunchState {
  const read = useCallback(
    (core: MinecraftCore) => (buildId ? core.getLaunchState(buildId) : IDLE),
    [buildId],
  );
  return useCoreValue(read);
}
