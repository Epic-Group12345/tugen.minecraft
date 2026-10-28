import { defineGame } from '@tugen/sdk';
import { manifest } from '../src/manifest';

it('манифест проходит проверку SDK', () => {
  expect(() => defineGame({ manifest, App: () => null })).not.toThrow();
});

it('иконка и способ показа — для нового лаунчера', () => {
  expect(manifest.icon).toBe('Cube');
  // Встроенный показ: Safe Area и острова лаунчера рассчитаны именно на него
  expect(manifest.presentation).toBe('embedded');
});

it('разделы идут в порядке вкладок', () => {
  // Первый раздел открывается при первом входе — порядок важен
  expect(manifest.sections?.map(section => section.id)).toEqual([
    'overview',
    'servers',
    'builds',
    'content',
    'skins',
    'settings',
  ]);
});
