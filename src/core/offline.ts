/* eslint-disable no-bitwise -- биты версии и варианта UUID побитовые по своей природе */
// Офлайн-игрок: ник без аккаунта Microsoft. UUID — как у самой игры для офлайн-ника
// (UUID версии 3 от «OfflinePlayer:<ник>»): с ним сохранения и инвентарь в мире те же,
// что при запуске игры другим лаунчером с тем же ником. Перенесено из services/game/offline.ts.
// MD5 — из legacy-модуля @noble/hashes: UUID версии 3 задан именно этим алгоритмом, не для защиты.

import { md5 } from '@noble/hashes/legacy.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

/** UUID офлайн-игрока с дефисами, как его считает игра */
export const offlineUuid = (name: string) => {
  const h = md5(utf8ToBytes(`OfflinePlayer:${name}`));
  h[6] = (h[6] & 0x0f) | 0x30;
  h[8] = (h[8] & 0x3f) | 0x80;
  const s = bytesToHex(h);
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
};

/** Ник, который примет игра: 3–16 символов, латиница, цифры и «_» */
export const isValidNickname = (name: string) =>
  /^[A-Za-z0-9_]{3,16}$/.test(name);
