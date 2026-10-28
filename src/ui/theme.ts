// Цвета нового дизайна лаунчера («статичное стекло»). Пакет не видит токены Uniwind лаунчера,
// поэтому держит свою копию значений; фон не задаём — его даёт окно лаунчера (#0D0D0D)
export const colors = {
  surface: '#17191A',
  // Слой поверх поверхности для наведения: состояние — светом, без масштаба и блюра
  hover: 'rgba(252, 255, 255, 0.06)',
  pressed: 'rgba(252, 255, 255, 0.1)',
  text: '#FCFFFF',
  textSecondary: 'rgba(252, 255, 255, 0.5)',
  accent: '#00EAFF',
  onAccent: '#062426',
} as const;

export const radius = { small: 8, large: 12 } as const;
