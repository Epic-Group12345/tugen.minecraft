import { StyleSheet, type ViewStyle } from 'react-native';
import { colors, radius } from './theme';

// Эффекты кнопок островов — копия GLOW_* из лаунчера (src/components/island/index.tsx), классы
// Uniwind переведены в StyleSheet: здесь их никто не соберёт. Свечение по краям и тень; цвет тени
// не анимируется (только opacity и transform), поэтому при наведении и нажатии поверх проявляются
// слои с теми же тенями: hover — плотнее (кромки 60% → 100%, внешняя тень 20% → ~50%), press —
// светлее, к белому

export interface GlowStyle {
  /** Кнопка с тенями */
  base: ViewStyle;
  /** Слой с теми же тенями, плотнее: проявляется при наведении */
  hover: ViewStyle;
  /** Те же тени светлее, к белому: проявляются, пока кнопка нажата */
  press: ViewStyle;
}

// bg-[#17191A]/35 p-1.5 flex-row items-center gap-1 rounded-lg
const button: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  padding: 6,
  borderRadius: radius.small,
  backgroundColor: '#17191A59',
};

// flex-1 rounded-lg — слой во всю кнопку
const layer: ViewStyle = { flex: 1, borderRadius: radius.small };

const neutral = StyleSheet.create({
  base: {
    ...button,
    boxShadow:
      '0px 3px 8px -4px #06242633, inset 0px 2px 2px -1px #FCFFFF99, inset 0px -1px 3px -2px #FCFFFF99',
  },
  hover: {
    ...layer,
    boxShadow:
      '0px 3px 8px -4px #06242666, inset 0px 2px 2px -1px #FCFFFF, inset 0px -1px 3px -2px #FCFFFF',
  },
  press: {
    ...layer,
    boxShadow:
      '0px 3px 8px -4px #FCFFFF33, inset 0px 2px 2px -1px #E3E6E6, inset 0px -1px 3px -2px #E3E6E6',
  },
});

const cyan = StyleSheet.create({
  base: {
    ...button,
    boxShadow:
      'inset 0px 2px 2px -1px #00EAFF99, inset 0px -1px 3px -2px #00EAFF99, 0px 3px 8px -4px #00EAFF33',
  },
  hover: {
    ...layer,
    boxShadow:
      'inset 0px 2px 2px -1px #00EAFF, inset 0px -1px 3px -2px #00EAFF, 0px 3px 8px -4px #00EAFF66',
  },
  press: {
    ...layer,
    boxShadow:
      'inset 0px 2px 2px -1px #73F2FF, inset 0px -1px 3px -2px #73F2FF, 0px 3px 8px -4px #73F2FF66',
  },
});

const cyanFill = StyleSheet.create({
  base: {
    ...button,
    backgroundColor: colors.accent,
    boxShadow:
      '0px 3px 8px -4px #06242633, inset 0px 2px 2px -1px #FCFFFF99, inset 0px -1px 3px -2px #FCFFFF99',
  },
  press: {
    ...layer,
    boxShadow:
      '0px 3px 8px -4px #00EAFF33, inset 0px 2px 2px -1px #E3E6E6, inset 0px -1px 3px -2px #E3E6E6',
  },
});

/** Белые кромки — обычные кнопки и неоткрытые разделы нижнего острова */
export const GLOW_NEUTRAL: GlowStyle = neutral;

/** Бирюзовые кромки #00EAFF — открытый раздел нижнего острова */
export const GLOW_CYAN: GlowStyle = cyan;

/** Залитая #00EAFF, как «Открыть» на карточке игры в лаунчере: белые кромки и тёмная тень;
    при нажатии тень — цвета кнопки. Текст на ней — colors.onAccent */
export const GLOW_CYAN_FILL: GlowStyle = {
  base: cyanFill.base,
  hover: neutral.hover,
  press: cyanFill.press,
};
