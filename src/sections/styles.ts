import { StyleSheet } from 'react-native';
import { colors, radius } from '../ui/theme';

// Общие стили экранов разделов: шрифт не задаём — лаунчер подставляет Ubuntu Sans
export const sectionStyles = StyleSheet.create({
  card: {
    gap: 8,
    padding: 20,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
  },
  heading: { fontSize: 28, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, color: colors.textSecondary },
});
