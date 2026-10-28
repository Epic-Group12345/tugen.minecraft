import type { GameManifest } from '@tugen/sdk';

// Разделы — сервисы издателя. Боковой панели в новом лаунчере нет, поэтому строку разделов рисует
// само мини-приложение (src/ui/tabs.tsx); лаунчер лишь помнит открытый раздел и передаёт его в App
// пропом section. Иконки разделов оставлены для лаунчеров, которые их показывают (старый интерфейс)
export const manifest: GameManifest = {
  id: 'minecraft',
  name: 'Minecraft',
  version: '0.1.0',
  // Иконка Gravity UI для карточки и островов лаунчера
  icon: 'Cube',
  // Рисуемся внутри окна лаунчера, под его островами, а не отдельным окном
  presentation: 'embedded',
  sections: [
    { id: 'overview', title: { ru: 'Обзор', en: 'Overview' }, icon: 'House' },
    { id: 'servers', title: { ru: 'Серверы', en: 'Servers' }, icon: 'Server' },
    { id: 'builds', title: { ru: 'Сборки', en: 'Builds' }, icon: 'Box' },
    {
      id: 'content',
      title: { ru: 'Контент', en: 'Content' },
      icon: 'Circles5Random',
    },
    { id: 'skins', title: { ru: 'Скины', en: 'Skins' }, icon: 'Persons' },
  ],
};
