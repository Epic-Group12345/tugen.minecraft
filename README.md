# tugen.minecraft

Мини-приложение Minecraft для TUGEN на React Native: пространство игры внутри окна лаунчера. Пишется
на [tugen.sdk](https://github.com/Epic-Group12345/tugen.sdk) — тем же SDK, что получат сторонние
разработчики, — и служит образцом для них.

С лаунчером общается только через `useHost()` из SDK: файлы своей папки, загрузки, запуск процесса.
Разделы игры (Обзор, Серверы, Сборки, Контент, Скины) объявлены в манифесте (`src/manifest.ts`):
лаунчер ставит их в боковую панель вместо своих кнопок, а открытый раздел приходит в `App` пропом
`section`. Переключаться между разделами из кода — `useHost().navigation.open(id)`.

Нативной части у мини-приложения нет: за `GameHost` стоят модули лаунчера и ядро
[tugen.core](https://github.com/Epic-Group12345/tugen.core).

## Переезд из лаунчера

Сейчас здесь заглушка. Логика и экраны Minecraft живут в
[tugen.launcher](https://github.com/Epic-Group12345/tugen.launcher) (`src/games/minecraft` — уже на
том же API SDK) и переедут сюда:

| Что                                              | Сейчас в лаунчере                                      |
| ------------------------------------------------ | ------------------------------------------------------ |
| сборки: список, создание, настройки              | `services/game/builds.ts`, `settings.ts`, `setup.ts`   |
| версии Mojang, описание версии, загрузчики, Java | `services/game/mojang.ts`, `version.ts`, `loaders.ts`, `java.ts` |
| подготовка и запуск, журнал                      | `services/game/launch.ts`, `runtime.ts`, `logs.ts`     |
| моды и контент сборки, импорт из других лаунчеров | `services/game/content.ts`, `imports.ts`              |
| офлайн-игрок, раскладка папки                    | `services/game/offline.ts`, `paths.ts`                 |
| экраны                                           | `pages/builds`, `components/build-*`, `game-controls`, `import-list`  |

Вызовы `native/game` при переезде заменяются на `useHost()`. Это только JS, поэтому до игроков всё
доходит по воздуху, без нового релиза.

## Работа

```bash
yarn install
yarn typecheck
yarn test
```
