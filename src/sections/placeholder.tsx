import { localize, useHost } from '@tugen/sdk';
import { Text, View } from 'react-native';
import { t, upcoming } from '../i18n';
import { sectionStyles as styles } from './styles';

interface PlaceholderProps {
  id: string;
  title: string;
}

// Заглушка раздела, пока его экран не переехал из лаунчера (см. README)
export function Placeholder({ id, title }: PlaceholderProps) {
  const locale = useHost().system.locale;
  const what = upcoming[id];
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{title}</Text>
      {what && (
        <Text style={styles.body}>
          {t('soon', locale)}: {localize(what, locale)}
        </Text>
      )}
    </View>
  );
}
