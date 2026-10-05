import { defineGame } from '@tugen/sdk';
import { manifest } from '../src/manifest';

it('манифест проходит проверку SDK', () => {
  expect(() => defineGame({ manifest, App: () => null })).not.toThrow();
});
