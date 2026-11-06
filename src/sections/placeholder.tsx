import { localize, useHost } from '@tugen/sdk';
import { StyleSheet, Text, View } from 'react-native';
import { manifest } from '../manifest';
import { t, upcoming } from '../i18n';
import { Card } from '../ui/controls';
import { GravityIcon } from '../ui/icon';
import { sectionStyles as styles } from './styles';

interface PlaceholderProps {
  id: string;
  title: string;
}

// Заглушка раздела, пока его экран не переехал из лаунчера (см. README)
export function Placeholder({ id, title }: PlaceholderProps) {
  const locale = useHost().system.locale;
  const what = upcoming[id];
  const icon =
    manifest.sections?.find(section => section.id === id)?.icon ?? 'Cube';
  return (
    <Card>
      <View style={localStyles.headingRow}>
        <GravityIcon name={icon} size={20} />
        <Text style={styles.heading}>{title}</Text>
      </View>
      {what && (
        <Text style={styles.body}>
          {t('soon', locale)}: {localize(what, locale)}
        </Text>
      )}
    </Card>
  );
}

const localStyles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
