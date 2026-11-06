import { platformFor } from '../src/core/platform';
import { pickRuntime } from '../src/core/java';
import {
  compareGameVersions,
  expand,
  gameArguments,
  javaComponent,
  jvmArguments,
  mavenPath,
  mergeVersions,
  resolveLibraries,
  rulesAllow,
  splitArgs,
  type VersionJson,
} from '../src/core/version';

// Перенесено из tugen.launcher/__tests__/game.test.ts: там система была модульной (Windows в
// тестах), здесь её передают явно — поэтому проверяем и macOS

const win = platformFor('windows', 'x64');
const mac = platformFor('macos', 'arm64');

describe('правила', () => {
  it('без правил — да, иначе решает последнее подошедшее', () => {
    expect(rulesAllow(undefined, win)).toBe(true);
    expect(
      rulesAllow(
        [{ action: 'allow' }, { action: 'disallow', os: { name: 'osx' } }],
        win,
      ),
    ).toBe(true);
    expect(rulesAllow([{ action: 'allow', os: { name: 'osx' } }], win)).toBe(
      false,
    );
    expect(rulesAllow([{ action: 'allow', os: { name: 'osx' } }], mac)).toBe(
      true,
    );
    expect(rulesAllow([{ action: 'allow', os: { arch: 'x86' } }], win)).toBe(
      false,
    );
  });

  it('проверяет features и кривой regexp версии', () => {
    const rules = [
      {
        action: 'allow' as const,
        features: { has_custom_resolution: true },
      },
    ];
    expect(rulesAllow(rules, win)).toBe(false);
    expect(rulesAllow(rules, win, { has_custom_resolution: true })).toBe(true);
    expect(rulesAllow([{ action: 'allow', os: { version: '(' } }], win)).toBe(
      false,
    );
  });
});

describe('библиотеки', () => {
  it('пути Maven', () => {
    expect(mavenPath('com.mojang:brigadier:1.0.18')).toBe(
      'com/mojang/brigadier/1.0.18/brigadier-1.0.18.jar',
    );
    expect(mavenPath('org.lwjgl:lwjgl:3.3.3:natives-windows')).toBe(
      'org/lwjgl/lwjgl/3.3.3/lwjgl-3.3.3-natives-windows.jar',
    );
    expect(mavenPath('a.b:c:1@zip')).toBe('a/b/c/1/c-1.zip');
    expect(mavenPath('broken')).toBe('');
  });

  const version: VersionJson = {
    id: '1.12.2',
    type: 'release',
    mainClass: 'net.minecraft.client.main.Main',
    libraries: [
      {
        name: 'com.mojang:patchy:1.1',
        downloads: {
          artifact: {
            path: 'com/mojang/patchy/1.1/patchy-1.1.jar',
            url: 'u1',
            sha1: 's1',
            size: 1,
          },
        },
      },
      {
        name: 'org.lwjgl.lwjgl:lwjgl-platform:2.9.4',
        natives: { windows: 'natives-windows-${arch}', osx: 'natives-osx' },
        extract: { exclude: ['META-INF/'] },
        downloads: {
          classifiers: {
            'natives-windows-64': {
              path: 'lwjgl-platform-natives-windows-64.jar',
              url: 'u2',
              sha1: 's2',
              size: 2,
            },
            'natives-osx': { path: 'osx.jar', url: 'u3' },
          },
        },
      },
      {
        name: 'ca.weblite:java-objc-bridge:1.0',
        rules: [{ action: 'allow', os: { name: 'osx' } }],
        downloads: { artifact: { path: 'objc.jar', url: 'u4' } },
      },
      {
        name: 'com.mojang:patchy:1.0',
        downloads: { artifact: { url: 'dup' } },
      },
    ],
  };

  it('Windows: свои библиотеки и natives, без повторов', () => {
    const r = resolveLibraries(version, win);
    expect(r.classpath.map(l => l.path)).toEqual([
      'com/mojang/patchy/1.1/patchy-1.1.jar',
    ]);
    expect(r.natives).toEqual([
      {
        path: 'lwjgl-platform-natives-windows-64.jar',
        url: 'u2',
        sha1: 's2',
        size: 2,
        exclude: ['META-INF/'],
      },
    ]);
  });

  it('macOS: библиотеки под osx', () => {
    const r = resolveLibraries(version, mac);
    expect(r.classpath.map(l => l.path)).toEqual([
      'com/mojang/patchy/1.1/patchy-1.1.jar',
      'objc.jar',
    ]);
    expect(r.natives.map(n => n.path)).toEqual(['osx.jar']);
  });

  it('без downloads — из репозитория Maven, хэш только у основного jar', () => {
    const r = resolveLibraries(
      {
        id: 'f',
        type: 'release',
        mainClass: 'K',
        libraries: [
          {
            name: 'org.ow2.asm:asm:9.10.1',
            url: 'https://maven.fabricmc.net',
            sha1: 'aa',
            size: 5,
          },
        ],
      },
      win,
    );
    expect(r.classpath[0]).toEqual({
      path: 'org/ow2/asm/asm/9.10.1/asm-9.10.1.jar',
      url: 'https://maven.fabricmc.net/org/ow2/asm/asm/9.10.1/asm-9.10.1.jar',
      sha1: 'aa',
      size: 5,
    });
  });
});

describe('аргументы', () => {
  const vars = {
    auth_player_name: 'Steve',
    natives_directory: 'C:\\n',
    classpath: 'a;b',
    resolution_width: '800',
    resolution_height: '600',
  };

  it('подставляет переменные, неизвестные оставляет', () => {
    expect(expand('--name ${auth_player_name} ${nope}', vars)).toBe(
      '--name Steve ${nope}',
    );
  });

  it('старый формат аргументов', () => {
    const legacy: VersionJson = {
      id: '1.8.9',
      type: 'release',
      mainClass: 'M',
      libraries: [],
      minecraftArguments: '--username ${auth_player_name}',
    };
    expect(jvmArguments(legacy, vars, win)).toEqual([
      '-Djava.library.path=C:\\n',
      '-Dminecraft.launcher.brand=${launcher_name}',
      '-cp',
      'a;b',
    ]);
    expect(
      gameArguments(legacy, vars, win, { has_custom_resolution: true }),
    ).toEqual(['--username', 'Steve', '--width', '800', '--height', '600']);
    expect(gameArguments(legacy, vars, win)).toEqual(['--username', 'Steve']);
  });

  it('новый формат с правилами', () => {
    const modern: VersionJson = {
      id: '1.21',
      type: 'release',
      mainClass: 'M',
      libraries: [],
      arguments: {
        game: [
          '--username',
          '${auth_player_name}',
          {
            rules: [{ action: 'allow', features: { is_demo_user: true } }],
            value: '--demo',
          },
        ],
        jvm: [
          {
            rules: [{ action: 'allow', os: { name: 'windows' } }],
            value: '-XX:HeapDumpPath=x',
          },
          {
            rules: [{ action: 'allow', os: { name: 'osx' } }],
            value: ['-XstartOnFirstThread'],
          },
          '-cp',
          '${classpath}',
        ],
      },
    };
    expect(jvmArguments(modern, vars, win)).toEqual([
      '-XX:HeapDumpPath=x',
      '-cp',
      'a;b',
    ]);
    expect(jvmArguments(modern, vars, mac)).toEqual([
      '-XstartOnFirstThread',
      '-cp',
      'a;b',
    ]);
    expect(gameArguments(modern, vars, win)).toEqual(['--username', 'Steve']);
  });

  it('версия загрузчика поверх родительской', () => {
    const parent: VersionJson = {
      id: '1.21',
      type: 'release',
      mainClass: 'Vanilla',
      libraries: [{ name: 'a:b:1' }],
      arguments: { game: ['--a'], jvm: ['-Da'] },
      javaVersion: { component: 'java-runtime-delta', majorVersion: 21 },
    };
    const child: VersionJson = {
      id: 'fabric',
      type: 'release',
      mainClass: 'Fabric',
      inheritsFrom: '1.21',
      libraries: [{ name: 'a:b:2' }],
      arguments: { game: ['--b'] },
    };
    const merged = mergeVersions(child, parent);
    expect(merged.mainClass).toBe('Fabric');
    expect(merged.jar).toBe('1.21');
    expect(merged.inheritsFrom).toBeUndefined();
    expect(merged.arguments?.game).toEqual(['--a', '--b']);
    expect(resolveLibraries(merged, win).classpath[0].path).toBe(
      'a/b/2/b-2.jar',
    );
    expect(javaComponent(merged)).toBe('java-runtime-delta');
    expect(javaComponent({ ...parent, javaVersion: undefined })).toBe(
      'jre-legacy',
    );
  });

  it('аргументы игрока с кавычками', () => {
    expect(splitArgs('-Xss1M  "-Dpath=C:\\My Folder" -XX:+UseG1GC')).toEqual([
      '-Xss1M',
      '-Dpath=C:\\My Folder',
      '-XX:+UseG1GC',
    ]);
    expect(splitArgs('   ')).toEqual([]);
  });
});

describe('версии игры', () => {
  it('сравниваются по числам, снапшоты — новее', () => {
    expect(compareGameVersions('1.9', '1.16.5')).toBeLessThan(0);
    expect(compareGameVersions('26.1', '1.21.11')).toBeGreaterThan(0);
    expect(compareGameVersions('1.20', '1.20.0')).toBe(0);
    expect(compareGameVersions('26.4-snapshot-2', '26.3')).toBeGreaterThan(0);
  });
});

describe('система', () => {
  it('Windows x64', () => {
    expect(win).toMatchObject({
      name: 'windows',
      arch: 'x86_64',
      javaPlatform: 'windows-x64',
      classpathSeparator: ';',
      javaBinary: 'bin/java.exe',
    });
  });

  it('Mac на Apple Silicon и Intel', () => {
    expect(mac).toMatchObject({
      name: 'osx',
      arch: 'arm64',
      javaPlatform: 'mac-os-arm64',
      javaFallbackPlatform: 'mac-os',
      classpathSeparator: ':',
    });
    expect(mac.javaBinary).toBe('jre.bundle/Contents/Home/bin/java');
    expect(platformFor('macos', 'x64')).toMatchObject({
      arch: 'x86_64',
      javaPlatform: 'mac-os',
      javaFallbackPlatform: undefined,
    });
  });

  it('Java — своей платформы, на Apple Silicon — запасной Intel', () => {
    const runtime = { manifest: { url: 'u', sha1: 's' } };
    expect(
      pickRuntime(
        { 'windows-x64': { 'java-runtime-delta': [runtime] } },
        'java-runtime-delta',
        win,
      ),
    ).toBe(runtime);
    expect(
      pickRuntime({ 'mac-os': { 'jre-legacy': [runtime] } }, 'jre-legacy', win),
    ).toBeNull();
    expect(
      pickRuntime({ 'mac-os': { 'jre-legacy': [runtime] } }, 'jre-legacy', mac),
    ).toBe(runtime);
  });
});
