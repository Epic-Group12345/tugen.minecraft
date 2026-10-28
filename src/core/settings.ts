import type { McSettings } from './types';

// Общие настройки игры: ник, память, аргументы java, окно. Чистые функции — над объёмом памяти
// компьютера (host.system.totalMemoryMb) и сохранённым значением из host.storage, которому не
// доверяем: оно могло остаться от старой версии или быть испорчено

export const SETTINGS_KEY = 'settings';

/** Меньше этого Minecraft с модами не стартует, а ванила еле живёт */
const MIN_MEMORY_MB = 1024;
/** Шаг памяти: ползунок и рекомендация кратны 512 МБ */
const MEMORY_STEP_MB = 512;
/** Оставляем системе хотя бы столько, чтобы она не ушла в подкачку */
const SYSTEM_RESERVE_MB = 1024;
/** Объём памяти неизвестен (нет данных от лаунчера) — потолок как у лаунчера */
const UNKNOWN_LIMIT_MB = 8192;
/** -Xms: начальная куча; больше её не задаём — java сама растёт до -Xmx */
export const MEMORY_START_MB = 512;
/** Окно больше этого — явно опечатка, игре такое не передаём */
const MAX_WINDOW_PX = 16384;

/** Ник, который примет игра: 3–16 символов, латиница, цифры и «_» */
export const isValidNickname = (name: string) =>
  /^[A-Za-z0-9_]{3,16}$/.test(name);

const floorStep = (mb: number) =>
  Math.floor(mb / MEMORY_STEP_MB) * MEMORY_STEP_MB;

/**
 * Границы ползунка памяти. Потолок — оперативная память без запаса системе (как memoryLimit
 * лаунчера); рекомендация — четверть памяти, но от 2 до 4 ГБ (как defaultMemory)
 */
export function memoryRange(totalMb: number): {
  min: number;
  max: number;
  recommended: number;
} {
  const max = totalMb
    ? Math.max(MIN_MEMORY_MB, floorStep(totalMb - SYSTEM_RESERVE_MB))
    : UNKNOWN_LIMIT_MB;
  const recommended = totalMb
    ? Math.max(2048, Math.min(4096, floorStep(totalMb / 4)))
    : 2048;
  return { min: MIN_MEMORY_MB, max, recommended: Math.min(recommended, max) };
}

export const defaultSettings = (totalMb: number): McSettings => ({
  nickname: 'Player',
  memoryMb: memoryRange(totalMb).recommended,
  jvmArgs: '',
  windowWidth: 0,
  windowHeight: 0,
});

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const windowSize = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? clamp(Math.round(value), 0, MAX_WINDOW_PX)
    : fallback;

/**
 * Настройки поверх прежних: чужие типы отбрасываются, память — в границах ползунка. Ник не
 * проверяем: поле ввода сохраняет его на каждый символ, а недописанный ник — не ошибка.
 * Проверяет его запуск
 */
export function normalizeSettings(
  base: McSettings,
  patch: Partial<Record<keyof McSettings, unknown>>,
  totalMb: number,
): McSettings {
  const { min, max } = memoryRange(totalMb);
  const memory = patch.memoryMb;
  return {
    nickname:
      typeof patch.nickname === 'string'
        ? patch.nickname.trim()
        : base.nickname,
    memoryMb:
      typeof memory === 'number' && Number.isFinite(memory)
        ? clamp(Math.round(memory), min, max)
        : clamp(base.memoryMb, min, max),
    jvmArgs: typeof patch.jvmArgs === 'string' ? patch.jvmArgs : base.jvmArgs,
    windowWidth: windowSize(patch.windowWidth, base.windowWidth),
    windowHeight: windowSize(patch.windowHeight, base.windowHeight),
  };
}

/** Сохранённые настройки (что угодно из хранилища) → настройки, с которыми можно работать */
export function loadSettings(stored: unknown, totalMb: number): McSettings {
  const defaults = defaultSettings(totalMb);
  if (!stored || typeof stored !== 'object') {
    return defaults;
  }
  return normalizeSettings(
    defaults,
    stored as Partial<Record<keyof McSettings, unknown>>,
    totalMb,
  );
}
