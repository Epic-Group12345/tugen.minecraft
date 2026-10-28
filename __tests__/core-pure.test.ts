import { launchArgs, launchFeatures } from '../src/core/launch-args';
import {
  forgeVersionFrom,
  forgeVersionsFrom,
  launchVersionId,
} from '../src/core/loaders';
import { LogParser, guessLevel } from '../src/core/logs';
import { filterVersions, parseManifest } from '../src/core/mojang';
import { md5, offlineUuid, toHex, utf8 } from '../src/core/offline';
import { platformFor } from '../src/core/platform';
import { appendLines, MAX_LOG_LINES } from '../src/core/runtime';
import {
  defaultSettings,
  isValidNickname,
  loadSettings,
  memoryRange,
  normalizeSettings,
} from '../src/core/settings';
import type { VersionJson } from '../src/core/version';

describe('офлайн-игрок', () => {
  // Эталоны — node crypto и UUID.nameUUIDFromBytes из Java
  it('md5 совпадает с эталоном', () => {
    const cases: [string, string][] = [
      ['', 'd41d8cd98f00b204e9800998ecf8427e'],
      ['abc', '900150983cd24fb0d6963f7d28e17f72'],
      ['Привет, мир', '464899b4b50fc966ad2753ca039e7378'],
      ['x'.repeat(200), '30a83621ce5422fbdfdd539777458c78'],
    ];
    for (const [text, hash] of cases) {
      expect(toHex(md5(utf8(text)))).toBe(hash);
    }
  });

  it('UUID как у игры', () => {
    expect(offlineUuid('Player')).toBe('a01e3843-e521-3998-958a-f459800e4d11');
    expect(offlineUuid('Notch')).toBe('b50ad385-829d-3141-a216-7e7d7539ba7f');
    expect(offlineUuid('jeb_')).toBe('a762f560-4fce-3236-812a-b80efff0b62b');
  });

  it('проверка ника', () => {
    expect(isValidNickname('Steve_123')).toBe(true);
    expect(isValidNickname('ab')).toBe(false);
    expect(isValidNickname('Игрок')).toBe(false);
    expect(isValidNickname('a'.repeat(17))).toBe(false);
    expect(isValidNickname('with space')).toBe(false);
  });
});

describe('память и настройки', () => {
  it('границы как у лаунчера', () => {
    // 16 ГБ: потолок без 1 ГБ системе, рекомендация — 4 ГБ
    expect(memoryRange(16384)).toEqual({
      min: 1024,
      max: 15360,
      recommended: 4096,
    });
    // 4 ГБ: потолок 3 ГБ, рекомендация не меньше 2 ГБ
    expect(memoryRange(4096)).toEqual({
      min: 1024,
      max: 3072,
      recommended: 2048,
    });
    // Совсем мало памяти: потолок не ниже минимума, рекомендация не выше потолка
    expect(memoryRange(1536)).toEqual({
      min: 1024,
      max: 1024,
      recommended: 1024,
    });
    // Объём неизвестен
    expect(memoryRange(0)).toEqual({ min: 1024, max: 8192, recommended: 2048 });
  });

  it('по умолчанию', () => {
    expect(defaultSettings(16384)).toEqual({
      nickname: 'Player',
      memoryMb: 4096,
      jvmArgs: '',
      windowWidth: 0,
      windowHeight: 0,
    });
  });

  it('правка держит память в границах и отбрасывает чужие типы', () => {
    const base = defaultSettings(8192);
    expect(normalizeSettings(base, { memoryMb: 100000 }, 8192).memoryMb).toBe(
      7168,
    );
    expect(normalizeSettings(base, { memoryMb: 10 }, 8192).memoryMb).toBe(1024);
    expect(
      normalizeSettings(base, { windowWidth: -5, windowHeight: 720.4 }, 8192),
    ).toMatchObject({ windowWidth: 0, windowHeight: 720 });
    expect(
      normalizeSettings(base, { nickname: 42, jvmArgs: null }, 8192),
    ).toEqual(base);
    // Недописанный ник сохраняется: его проверит запуск
    expect(normalizeSettings(base, { nickname: ' St ' }, 8192).nickname).toBe(
      'St',
    );
  });

  it('сохранённое из хранилища', () => {
    expect(loadSettings(null, 8192)).toEqual(defaultSettings(8192));
    expect(loadSettings('garbage', 8192)).toEqual(defaultSettings(8192));
    expect(loadSettings({ nickname: 'Alex', memoryMb: 3000 }, 8192)).toEqual({
      ...defaultSettings(8192),
      nickname: 'Alex',
      memoryMb: 3000,
    });
  });
});

describe('манифест версий', () => {
  const text = JSON.stringify({
    latest: { release: '1.21.4', snapshot: '25w02a' },
    versions: [
      {
        id: '25w02a',
        type: 'snapshot',
        url: 'u1',
        sha1: 's1',
        releaseTime: 't1',
      },
      {
        id: '1.21.4',
        type: 'release',
        url: 'u2',
        sha1: 's2',
        releaseTime: 't2',
      },
      {
        id: 'b1.7.3',
        type: 'old_beta',
        url: 'u3',
        sha1: 's3',
        releaseTime: 't3',
      },
      { id: 'x', type: 'weird', url: 'u4' },
      { id: '', type: 'release', url: 'u5' },
      { id: 'nourl', type: 'release' },
      null,
    ],
  });

  it('разбирает и пропускает испорченные записи', () => {
    const manifest = parseManifest(text);
    expect(manifest?.latest).toEqual({ release: '1.21.4', snapshot: '25w02a' });
    expect(manifest?.versions.map(v => v.id)).toEqual([
      '25w02a',
      '1.21.4',
      'b1.7.3',
    ]);
    expect(parseManifest('not json')).toBeNull();
    expect(parseManifest('{"versions": 5}')).toBeNull();
  });

  it('по умолчанию — только релизы, со снапшотами — всё', () => {
    const versions = parseManifest(text)!.versions;
    expect(filterVersions(versions, false)).toEqual([
      { id: '1.21.4', type: 'release', releaseTime: 't2' },
    ]);
    expect(filterVersions(versions, true).map(v => v.id)).toEqual([
      '25w02a',
      '1.21.4',
      'b1.7.3',
    ]);
  });
});

describe('загрузчики', () => {
  it('id версии загрузчика', () => {
    expect(launchVersionId('26.3', 'vanilla')).toBe('26.3');
    expect(launchVersionId('26.3', 'fabric', '0.19.5')).toBe(
      'fabric-loader-0.19.5-26.3',
    );
    expect(launchVersionId('1.21', 'quilt', '0.28.0')).toBe(
      'quilt-loader-0.28.0-1.21',
    );
    expect(launchVersionId('1.12.2', 'forge', '1.12.2-14.23.5.2859')).toBe(
      'forge-1.12.2-14.23.5.2859',
    );
  });

  it('версии Forge из Maven — под свою игру, от новых', () => {
    const xml =
      '<versions><version>1.12.2-14.23.5.2858</version><version>1.12.2-14.23.5.2859</version>' +
      '<version>1.12.1-14.22.0.2444</version><version>1.7.10-10.13.4.1614-1.7.10</version></versions>';
    expect(forgeVersionsFrom(xml, '1.12.2')).toEqual([
      '1.12.2-14.23.5.2859',
      '1.12.2-14.23.5.2858',
    ]);
    expect(forgeVersionsFrom(xml, '1.7.10')).toEqual([
      '1.7.10-10.13.4.1614-1.7.10',
    ]);
  });

  it('старый формат установщика Forge (versionInfo)', () => {
    const { json, copies } = forgeVersionFrom(
      {
        install: {
          path: 'net.minecraftforge:forge:1.7.10-10.13.4.1614-1.7.10',
          filePath: 'forge-universal.jar',
        },
        versionInfo: {
          id: '1.7.10-Forge10.13.4.1614-1.7.10',
          type: 'release',
          mainClass: 'net.minecraft.launchwrapper.Launch',
          libraries: [
            {
              name: 'org.scala-lang:scala-library:2.11.1',
              url: 'http://files.minecraftforge.net/maven/',
            },
          ],
        },
      },
      () => {
        throw new Error('not used');
      },
      'forge-1.7.10-10.13.4.1614-1.7.10',
      '1.7.10',
    );
    expect(json.id).toBe('forge-1.7.10-10.13.4.1614-1.7.10');
    expect(json.inheritsFrom).toBe('1.7.10');
    expect(json.libraries[0].url).toBe('https://maven.minecraftforge.net/');
    expect(copies).toEqual([
      {
        from: 'forge-universal.jar',
        to: 'libraries/net/minecraftforge/forge/1.7.10-10.13.4.1614-1.7.10/forge-1.7.10-10.13.4.1614-1.7.10.jar',
      },
    ]);
  });

  it('новый формат без обработчиков; с обработчиками — отказ', () => {
    const version = {
      id: '1.12.2-forge-14.23.5.2859',
      type: 'release',
      mainClass: 'net.minecraft.launchwrapper.Launch',
      inheritsFrom: '1.12.2',
      libraries: [
        {
          name: 'net.minecraftforge:forge:1.12.2-14.23.5.2859',
          downloads: { artifact: { path: 'net/f/forge.jar', url: '' } },
        },
        {
          name: 'lzma:lzma:0.0.1',
          downloads: {
            artifact: {
              path: 'lzma/lzma.jar',
              url: 'https://libraries.minecraft.net/lzma/lzma.jar',
            },
          },
        },
      ],
    };
    const { copies } = forgeVersionFrom(
      { json: '/version.json' },
      () => version,
      'forge-x',
      '1.12.2',
    );
    expect(copies).toEqual([
      { from: 'maven/net/f/forge.jar', to: 'libraries/net/f/forge.jar' },
    ]);
    expect(() =>
      forgeVersionFrom({ processors: [{}] }, () => version, 'x', '1.16.5'),
    ).toThrow();
  });
});

describe('команда запуска', () => {
  const version: VersionJson = {
    id: '1.21',
    type: 'release',
    mainClass: 'net.minecraft.client.main.Main',
    libraries: [],
    arguments: {
      game: [
        '--username',
        '${auth_player_name}',
        '--uuid',
        '${auth_uuid}',
        '--gameDir',
        '${game_directory}',
        {
          rules: [
            { action: 'allow', features: { has_custom_resolution: true } },
          ],
          value: [
            '--width',
            '${resolution_width}',
            '--height',
            '${resolution_height}',
          ],
        },
      ],
      jvm: ['-Djava.library.path=${natives_directory}', '-cp', '${classpath}'],
    },
    logging: {
      client: {
        argument: '-Dlog4j.configurationFile=${path}',
        type: 'log4j2-xml',
        file: { id: 'client-1.12.xml', sha1: 'x', size: 1, url: 'u' },
      },
    },
  };
  const base = {
    version,
    libraries: {
      classpath: [{ path: 'a/a.jar', url: 'u' }],
      natives: [],
    },
    platform: platformFor('windows', 'x64'),
    launcherVersion: '0.1.0',
    gameDir: 'builds/b1',
    natives: 'natives/b1',
    gameAssets: 'assets',
    assetsId: '17',
    absolute: (p: string) => `C:\\G\\${p.replace(/\//g, '\\')}`,
  };
  const settings = {
    nickname: 'Steve',
    memoryMb: 4096,
    jvmArgs: '-XX:+UseG1GC "-Dx=a b"',
    windowWidth: 0,
    windowHeight: 0,
  };

  it('память, свои аргументы, журнал, classpath и игрок', () => {
    const args = launchArgs({ ...base, settings });
    expect(args.slice(0, 2)).toEqual(['-Xms512M', '-Xmx4096M']);
    expect(args).toContain('-XX:+UseG1GC');
    expect(args).toContain('-Dx=a b');
    expect(args).toContain('-Djava.library.path=C:\\G\\natives\\b1');
    expect(args[args.indexOf('-cp') + 1]).toBe(
      'C:\\G\\libraries\\a\\a.jar;C:\\G\\versions\\1.21\\1.21.jar',
    );
    expect(args).toContain(
      '-Dlog4j.configurationFile=C:\\G\\assets\\log_configs\\client-1.12.xml',
    );
    const main = args.indexOf('net.minecraft.client.main.Main');
    expect(args.slice(main + 1)).toEqual([
      '--username',
      'Steve',
      '--uuid',
      offlineUuid('Steve').replace(/-/g, ''),
      '--gameDir',
      'C:\\G\\builds\\b1',
    ]);
  });

  it('окно — только когда заданы обе стороны', () => {
    expect(launchFeatures({ ...settings, windowWidth: 800 })).toEqual({
      has_custom_resolution: false,
    });
    const args = launchArgs({
      ...base,
      settings: { ...settings, windowWidth: 800, windowHeight: 600 },
    });
    expect(args.slice(-4)).toEqual(['--width', '800', '--height', '600']);
  });

  it('macOS: разделитель classpath «:»; -Xms не больше -Xmx', () => {
    const args = launchArgs({
      ...base,
      platform: platformFor('macos', 'arm64'),
      absolute: (p: string) => `/G/${p}`,
      settings: { ...settings, memoryMb: 256, jvmArgs: '' },
    });
    expect(args.slice(0, 2)).toEqual(['-Xms256M', '-Xmx256M']);
    expect(args[args.indexOf('-cp') + 1]).toBe(
      '/G/libraries/a/a.jar:/G/versions/1.21/1.21.jar',
    );
  });
});

describe('журнал', () => {
  it('события log4j XML через несколько кусков', () => {
    const parser = new LogParser();
    const event =
      '<log4j:Event logger="net.minecraft" timestamp="0" level="WARN" thread="Render thread">\n' +
      '  <log4j:Message><![CDATA[Something <odd>]]></log4j:Message>\n' +
      '</log4j:Event>\n';
    expect(parser.feed('plain start\n' + event.slice(0, 40))).toEqual([
      { level: 'info', text: 'plain start' },
    ]);
    const lines = parser.feed(event.slice(40));
    expect(lines).toHaveLength(1);
    expect(lines[0].level).toBe('warn');
    expect(lines[0].text).toMatch(/\[Render thread\/WARN\]: Something <odd>$/);
  });

  it('исключения — строками ошибок, недописанная строка ждёт flush', () => {
    const parser = new LogParser();
    const lines = parser.feed(
      '<log4j:Event logger="x" timestamp="0" level="ERROR" thread="main"><log4j:Message><![CDATA[Crash]]></log4j:Message>' +
        '<log4j:Throwable><![CDATA[java.lang.RuntimeException\n\tat a.b]]></log4j:Throwable></log4j:Event>half',
    );
    expect(lines.map(l => l.level)).toEqual(['error', 'error', 'error']);
    expect(parser.flush()).toEqual([{ level: 'info', text: 'half' }]);
  });

  it('уровень обычных строк', () => {
    expect(guessLevel('[12:00:00] [main/ERROR]: boom')).toBe('error');
    expect(guessLevel('[12:00:00] [main/WARN]: hmm')).toBe('warn');
    expect(guessLevel('Hello')).toBe('info');
  });

  it('в состоянии — не больше 500 последних строк', () => {
    const many = Array.from({ length: 600 }, (_, i) => String(i));
    const log = appendLines(['old'], many);
    expect(log).toHaveLength(MAX_LOG_LINES);
    expect(log[log.length - 1]).toBe('599');
    const same: string[] = ['a'];
    expect(appendLines(same, [])).toBe(same);
  });
});
