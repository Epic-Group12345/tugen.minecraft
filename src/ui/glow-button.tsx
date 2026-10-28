import { useState, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useAnimatedFlag } from './animation';
import { GLOW_NEUTRAL, type GlowStyle } from './glow';
import { colors } from './theme';

// Кнопка островов — копия GlowButton лаунчера на StyleSheet. «Статичное стекло» (DESIGN.md
// лаунчера): размер не меняется, ни масштаба, ни блюра — состояния светом и тенью

// Наведение проявляется плавно; нажатие — быстро, чтобы отклик был сразу, а гаснет мягче
const HOVER_TIMING = { in: 160, out: 220 };
const PRESS_TIMING = { in: 60, out: 180 };

interface GlowButtonProps {
  label: string;
  glow?: GlowStyle;
  onPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
  /** Добавка к оформлению кнопки: отступы, ширина. Скругление не трогать — оно у слоёв то же */
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function GlowButton({
  label,
  glow = GLOW_NEUTRAL,
  onPress,
  disabled = false,
  selected,
  style,
  children,
}: GlowButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const hover = useAnimatedFlag(hovered && !disabled, HOVER_TIMING);
  const press = useAnimatedFlag(pressed && !disabled, PRESS_TIMING);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      // Без своего оформления Fabric «сплющивает» Pressable, и на Windows пропадает наведение
      collapsable={false}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[glow.base, styles.pointer, style, disabled && styles.disabled]}
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: hover }]}
      >
        <View style={glow.hover} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: press }]}
      >
        <View style={glow.press} />
      </Animated.View>
      {children}
    </Pressable>
  );
}

interface GlowTextProps {
  children: ReactNode;
  /** Тёмный текст — для залитой кнопки GLOW_CYAN_FILL */
  onAccent?: boolean;
}

/** Подпись кнопки: text-xs с отступом px-1.5, как «Открыть» в лаунчере */
export function GlowText({ children, onAccent = false }: GlowTextProps) {
  return (
    <Text style={[styles.text, onAccent && styles.onAccent]}>{children}</Text>
  );
}

const styles = StyleSheet.create({
  // Над нажимаемым стеклом курсор — рука
  pointer: { cursor: 'pointer' },
  disabled: { opacity: 0.5, cursor: 'auto' },
  text: {
    paddingHorizontal: 6,
    fontSize: 12,
    lineHeight: 16,
    color: colors.text,
  },
  onAccent: { fontWeight: '500', color: colors.onAccent },
});
