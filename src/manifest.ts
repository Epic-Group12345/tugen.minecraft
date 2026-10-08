import type { GameManifest } from '@tugen/sdk';

// Разделы — сервисы издателя: лаунчер ставит их в боковую панель вместо своих кнопок, пока игра
// открыта, а открытый приходит в App пропом section. Тот же список пока держит лаунчер у себя
// (src/games/minecraft) — экраны ещё там; при переезде он уйдёт оттуда
export const manifest: GameManifest = {
  id: 'minecraft',
  name: 'Minecraft',
  version: '0.1.0',
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
