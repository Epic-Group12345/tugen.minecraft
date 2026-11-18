// Заглушка react-native-svg для тестов в Node: нативные компоненты в Jest не нужны, проверяется
// только, что SDK реэкспортирует нужные имена
const Component = () => null;

module.exports = {
  __esModule: true,
  default: Component,
  Svg: Component,
  G: Component,
  Path: Component,
  Circle: Component,
  Ellipse: Component,
  Line: Component,
  Polygon: Component,
  Polyline: Component,
  Rect: Component,
  Defs: Component,
  LinearGradient: Component,
  RadialGradient: Component,
  Stop: Component,
  ClipPath: Component,
  Text: Component,
};
