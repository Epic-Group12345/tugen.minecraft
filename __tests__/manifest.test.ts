import { defineGame } from '@tugen/sdk';
import { GRAVITY_ICONS } from '../src/ui/gravity-icons';
import { manifest } from '../src/manifest';

it('манифест проходит проверку SDK', () => {
  expect(() => defineGame({ manifest, App: () => null })).not.toThrow();
});

it('иконка и способ показа — для нового лаунчера', () => {
  expect(manifest.icon).toBe('Cube');
  // Встроенный показ: Safe Area и острова лаунчера рассчитаны именно на него
  expect(manifest.presentation).toBe('embedded');
});

it('каталог серверов находится в обзоре, а не в списке разделов', () => {
  // Первый раздел открывается при первом входе — порядок важен
  expect(manifest.sections?.map(section => section.id)).toEqual([
    'overview',
    'builds',
    'content',
    'skins',
    'settings',
  ]);
});

it('все иконки манифеста включены в подмножество Gravity UI', () => {
  const icons = [
    manifest.icon,
    ...(manifest.sections ?? []).map(section => section.icon),
  ];
  for (const icon of icons) {
    expect(GRAVITY_ICONS).toHaveProperty(icon);
  }
});
