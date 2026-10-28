import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

// Минимальная копия useAnimatedFlag из лаунчера (src/lib/animation.tsx)

interface FlagTiming {
  /** Длительность включения, мс */
  in?: number;
  /** Длительность выключения, мс (по умолчанию как in) */
  out?: number;
}

/**
 * Плавный флаг: Animated.Value, который идёт к 1, когда on = true, и к 0 — когда false.
 * Нативный драйвер: в RNW анимация идёт в Windows Composition, не завися от JS-потока. Так
 * анимируются только opacity и transform, поэтому цвета и тени меняются слоями с прозрачностью
 */
export function useAnimatedFlag(
  on: boolean,
  { in: durationIn = 120, out: durationOut = durationIn }: FlagTiming = {},
) {
  const value = useRef(new Animated.Value(on ? 1 : 0)).current;

  useEffect(() => {
    const animation = Animated.timing(value, {
      toValue: on ? 1 : 0,
      duration: on ? durationIn : durationOut,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
      // Не регистрировать анимацию в InteractionManager: иначе на время каждого наведения
      // откладываются задачи runAfterInteractions
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [on, value, durationIn, durationOut]);

  return value;
}
