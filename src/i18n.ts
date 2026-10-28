import { localize, type LocalizedText } from '@tugen/sdk';

// Свои строки пакета: у лаунчера словарь свой, и до строк мини-приложения он не дотягивается
const strings = {
  memory: { ru: 'Память компьютера', en: 'Computer memory' },
  mb: { ru: 'МБ', en: 'MB' },
  soon: { ru: 'Скоро здесь будет', en: 'Coming soon' },
  sectionsLabel: { ru: 'Разделы Minecraft', en: 'Minecraft sections' },
} satisfies Record<string, LocalizedText>;

// Что появится в разделе — для заглушек, пока экраны не переехали из лаунчера
export const upcoming: Record<string, LocalizedText> = {
  servers: { ru: 'список серверов', en: 'a server list' },
  builds: { ru: 'ваши сборки', en: 'your builds' },
  content: { ru: 'моды и другой контент', en: 'mods and other content' },
  skins: { ru: 'смена скина', en: 'skin changer' },
};

export type StringKey = keyof typeof strings;

export const t = (key: StringKey, locale: string): string =>
  localize(strings[key], locale);
