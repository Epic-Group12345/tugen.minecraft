import type { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { GLOW_CYAN, GLOW_NEUTRAL } from './glow';
import { GlowButton } from './glow-button';
import { colors, radius } from './theme';
import { GravityIcon, type GravityIconName } from './icon';

// Острова — плавающие плашки с кнопками, копия островов лаунчера (src/components/island).
// Нижнего острова лаунчера в игре нет: низ окна наш, и здесь — навигация по разделам игры

/** Плашка острова — FLOATING_SURFACE_CLASS лаунчера: drop shadow 0 0, blur 4, neutral/950 */
export function IslandSurface({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

export interface IslandItem {
  id: string;
  title: string;
  icon: GravityIconName;
}

interface BottomIslandProps {
  items: readonly IslandItem[];
  active: string;
  onSelect: (id: string) => void;
  label: string;
  /** Отступ от низа окна — Safe Area лаунчера снизу (в игре обычно 0) */
  bottom?: number;
  /** Высота, которую остров закрывает снизу, — для нижнего отступа экранов */
  onHeight: (height: number) => void;
}

/**
 * Нижний остров — навигация по разделам, по центру внизу поверх экранов, как BottomBar лаунчера.
 * Пустое место вокруг плашки нажатия пропускает к экрану. Открытый раздел — бирюзовыми кромками,
 * остальные белыми. Иконки входят в пакет и растеризуются SDK нативным SVG-провайдером
 */
export function BottomIsland({
  items,
  active,
  onSelect,
  label,
  bottom = 0,
  onHeight,
}: BottomIslandProps) {
  return (
    <View
      pointerEvents="box-none"
      onLayout={event => onHeight(event.nativeEvent.layout.height)}
      style={[styles.dock, { bottom }]}
    >
      <IslandSurface>
        <View
          style={styles.row}
          accessibilityRole="toolbar"
          accessibilityLabel={label}
        >
          {items.map(item => {
            const selected = item.id === active;
            return (
              <GlowButton
                key={item.id}
                label={item.title}
                glow={selected ? GLOW_CYAN : GLOW_NEUTRAL}
                selected={selected}
                onPress={() => onSelect(item.id)}
              >
                <GravityIcon name={item.icon} size={16} />
                <Text style={styles.itemLabel}>{item.title}</Text>
              </GlowButton>
            );
          })}
        </View>
      </IslandSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  // flex-row items-center gap-1 rounded-xl bg-[#17191A] p-2 shadow-[0_0_4px_0_#0A0A0A]
  surface: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
    boxShadow: '0px 0px 4px 0px #0A0A0A',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemLabel: { fontSize: 12, lineHeight: 16, color: colors.text },
  // absolute bottom-0 left-0 right-0 z-10 items-center p-2
  dock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
    padding: 8,
  },
});
