import { localize, useHost, useSafeArea, type GameAppProps } from '@tugen/sdk';
import { ScrollView, StyleSheet, View } from 'react-native';
import { t } from './i18n';
import { manifest } from './manifest';
import { Overview } from './sections/overview';
import { Placeholder } from './sections/placeholder';
import { Tabs } from './ui/tabs';

const sections = manifest.sections ?? [];

// Корень мини-приложения. Лаунчер рисует нас на месте страницы, а поверх кладёт свои острова;
// их место приходит Safe Area — отступаем от неё, чтобы вкладки и текст не уходили под острова.
// Открытый раздел хранит лаунчер (помнит последний), мы лишь просим его сменить через navigation
export function App({ section, width, height }: GameAppProps) {
  const host = useHost();
  const safeArea = useSafeArea();
  const locale = host.system.locale;
  // Пустой или незнакомый раздел (первый вход, устаревший id) — первый из манифеста
  const current = sections.find(item => item.id === section) ?? sections[0];
  const tabs = sections.map(item => ({
    id: item.id,
    title: localize(item.title, locale),
  }));

  return (
    <View
      style={[
        styles.root,
        {
          width,
          height,
          paddingTop: safeArea.top,
          paddingLeft: safeArea.left,
          paddingRight: safeArea.right,
        },
      ]}
    >
      <View style={styles.header}>
        <Tabs
          tabs={tabs}
          active={current?.id ?? ''}
          onSelect={id => host.navigation.open(id)}
          label={t('sectionsLabel', locale)}
        />
      </View>
      <ScrollView
        style={styles.scroll}
        // Низ прокрутки — над нижним островом, но сама область уходит под него: контент виден
        // сквозь стекло острова и не обрезается раньше времени
        contentContainerStyle={[
          styles.content,
          { paddingBottom: safeArea.bottom },
        ]}
      >
        {current && current.id !== 'overview' ? (
          <Placeholder
            id={current.id}
            title={localize(current.title, locale)}
          />
        ) : (
          <Overview />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Фон не задаём: его даёт окно лаунчера
  root: { backgroundColor: 'transparent' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 4, gap: 12 },
});
