import { useState, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useAnimatedFlag } from './animation';
import { colors, radius } from './theme';

// Простые элементы экранов: карточка, поле ввода, строка списка выбора, полоса прогресса.
// Выпадающих меню лаунчера здесь нет — выбор строками с выделением

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

interface FieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  hint?: string;
}

/** Поле ввода с подписью; ошибка — под полем */
export function Field({
  label,
  error,
  hint,
  onFocus,
  onBlur,
  ...input
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...input}
        accessibilityLabel={label}
        placeholderTextColor={colors.textSecondary}
        onFocus={event => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={event => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          focused && styles.inputFocused,
          !!error && styles.inputError,
        ]}
      />
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

interface ChoiceRowProps {
  title: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
}

/** Строка списка выбора: выделенная — бирюзовая, наведение — светлым слоем по прозрачности */
export function ChoiceRow({
  title,
  detail,
  selected,
  onPress,
}: ChoiceRowProps) {
  const [hovered, setHovered] = useState(false);
  const hover = useAnimatedFlag(hovered && !selected, { in: 100, out: 180 });
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
      onPress={onPress}
      collapsable={false}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.row, selected && styles.rowSelected]}
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.rowHover, { opacity: hover }]}
      />
      <Text
        style={[styles.rowTitle, selected && styles.rowTitleSelected]}
        numberOfLines={1}
      >
        {title}
      </Text>
      {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
    </Pressable>
  );
}

/** Полоса прогресса: ширина не анимируется — заливка просто перерисовывается */
export function ProgressBar({ value }: { value: number }) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <View style={[styles.fill, { width: `${percent}%` }]} />
    </View>
  );
}

export const controlStyles = StyleSheet.create({
  // Ряд кнопок с переносом
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 20,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
  },
  field: { gap: 6 },
  label: { fontSize: 12, color: colors.textSecondary },
  input: {
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radius.small,
    backgroundColor: colors.field,
    fontSize: 14,
    color: colors.text,
  },
  inputFocused: { borderColor: colors.accentBorder },
  inputError: { borderColor: colors.dangerBorder },
  error: { fontSize: 12, color: colors.danger },
  hint: { fontSize: 12, color: colors.textSecondary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.small,
    overflow: 'hidden',
    cursor: 'pointer',
  },
  rowSelected: { backgroundColor: colors.accentSoft },
  rowHover: { backgroundColor: colors.hover },
  rowTitle: { flex: 1, fontSize: 13, color: colors.text },
  rowTitleSelected: { color: colors.accent },
  rowDetail: { fontSize: 12, color: colors.textSecondary },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: colors.field,
  },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.accent },
});
