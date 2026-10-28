import { useHost } from '@tugen/sdk';
import { Text, View } from 'react-native';
import { t } from '../i18n';
import { sectionStyles as styles } from './styles';

// Обзор — пока только то, что уже умеет SDK: объём памяти пригодится для выбора памяти игре
export function Overview() {
  const host = useHost();
  const locale = host.system.locale;
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Minecraft</Text>
      <Text style={styles.body}>
        {t('memory', locale)}: {host.system.totalMemoryMb()} {t('mb', locale)}
      </Text>
    </View>
  );
}
