import { localize, useHost, useSafeArea, type GameAppProps } from '@tugen/sdk';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CoreProvider } from './core/react';
import { t } from './i18n';
import { manifest } from './manifest';
import { Builds } from './sections/builds';
import { Overview } from './sections/overview';
import { Placeholder } from './sections/placeholder';
import { Settings } from './sections/settings';
import { Servers } from './sections/servers';
import { BottomIsland } from './ui/island';

const sections = manifest.sections ?? [];

// Наибольшая ширина колонки экранов: на широком окне строки не растягиваются во всю ширину
const CONTENT_MAX_WIDTH = 880;

// Корень мини-приложения. Лаунчер рисует нас на всё окно, а сверху кладёт свои острова; их место
// приходит Safe Area — отступаем от неё. Низ окна наш: там нижний остров с разделами игры.
// Открытый раздел хранит лаунчер (помнит последний), мы лишь просим его сменить через navigation
export function App(props: GameAppProps) {
  return (
    <CoreProvider>
      <Shell {...props} />
    </CoreProvider>
  );
}

function Shell({ section, width, height }: GameAppProps) {
  const host = useHost();
  const safeArea = useSafeArea();
  const locale = host.system.locale;
  // Сколько закрывает нижний остров — как Safe Area лаунчера, только наша
  const [islandHeight, setIslandHeight] = useState(0);
  // Пустой или незнакомый раздел (первый вход, устаревший id) — первый из манифеста
  const current = sections.find(item => item.id === section) ?? sections[0];
  const items = sections.map(item => ({
    id: item.id,
    title: localize(item.title, locale),
    icon: item.icon,
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
      <ScrollView
        style={styles.scroll}
        // Низ прокрутки — над нижним островом, но сама область уходит под него: контент виден
        // вокруг плашки и не обрезается раньше времени
        contentContainerStyle={[
          styles.content,
          { paddingBottom: islandHeight + safeArea.bottom + CONTENT_GAP },
        ]}
      >
        <View style={styles.column}>
          {renderSection(
            current?.id,
            current ? localize(current.title, locale) : '',
          )}
        </View>
      </ScrollView>
      <BottomIsland
        items={items}
        active={current?.id ?? ''}
        onSelect={id => host.navigation.open(id)}
        label={t('sectionsLabel', locale)}
        bottom={safeArea.bottom}
        onHeight={setIslandHeight}
      />
    </View>
  );
}

function renderSection(id: string | undefined, title: string): ReactNode {
  switch (id) {
    case 'builds':
      return <Builds />;
    case 'settings':
      return <Settings />;
    case 'overview':
    case undefined:
      return (
        <>
          <Overview />
          <Servers />
        </>
      );
    default:
      return <Placeholder id={id} title={title} />;
  }
}

// Отступ между краем экрана (или островом) и контентом
const CONTENT_GAP = 16;

const styles = StyleSheet.create({
  // Фон не задаём: его даёт окно лаунчера
  root: { backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: CONTENT_GAP },
  column: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    gap: 12,
  },
});
