import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from './theme';

export interface Tab {
  id: string;
  title: string;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onSelect: (id: string) => void;
  label: string;
}

// Строка разделов. В новом лаунчере нет боковой панели, куда раньше уходили разделы из манифеста,
// поэтому переключатель рисует само мини-приложение
export function Tabs({ tabs, active, onSelect, label }: TabsProps) {
  return (
    <View
      style={styles.row}
      accessibilityRole="tablist"
      accessibilityLabel={label}
    >
      {tabs.map(tab => (
        <TabButton
          key={tab.id}
          title={tab.title}
          selected={tab.id === active}
          onPress={() => onSelect(tab.id)}
        />
      ))}
    </View>
  );
}

interface TabButtonProps {
  title: string;
  selected: boolean;
  onPress: () => void;
}

function TabButton({ title, selected, onPress }: TabButtonProps) {
  // Наведение отслеживаем сами: в типах RN 0.81 у состояния Pressable есть только pressed
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.tab, selected && styles.selected]}
    >
      {({ pressed }) => (
        <>
          {/* Состояние — полупрозрачным слоем поверх, а не сменой размера: так велит дизайн */}
          {!selected && (hovered || pressed) && (
            <View
              pointerEvents="none"
              style={[styles.layer, pressed ? styles.pressed : styles.hover]}
            />
          )}
          <Text style={[styles.title, selected && styles.selectedTitle]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    padding: 4,
    alignSelf: 'flex-start',
    borderRadius: radius.large,
    backgroundColor: colors.surface,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.small,
    overflow: 'hidden',
    cursor: 'pointer',
  },
  selected: { backgroundColor: colors.accent },
  layer: { ...StyleSheet.absoluteFillObject },
  hover: { backgroundColor: colors.hover },
  pressed: { backgroundColor: colors.pressed },
  title: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  selectedTitle: { color: colors.onAccent },
});
