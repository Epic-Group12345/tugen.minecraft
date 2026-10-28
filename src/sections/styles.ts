import { StyleSheet } from 'react-native';
import { colors } from '../ui/theme';

// Общие стили экранов разделов: шрифт не задаём — лаунчер подставляет Ubuntu Sans
export const sectionStyles = StyleSheet.create({
  heading: { fontSize: 28, fontWeight: '700', color: colors.text },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  body: { fontSize: 14, color: colors.textSecondary },
  small: { fontSize: 12, color: colors.textSecondary },
  error: { fontSize: 13, color: colors.danger },
  // Заголовок экрана с кнопкой справа
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
});
