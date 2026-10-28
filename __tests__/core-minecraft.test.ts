import type { GameHost, LaunchOptions } from '@tugen/sdk';
import { createMinecraft } from '../src/core';
import { MANIFEST_CACHE, versionJson } from '../src/core/paths';

// Ядро целиком поверх GameHost в памяти: файлы — словарь, сеть — таблица ответов, процессы —
// записанные вызовы. Так проверяется хранилище сборок, кэш версий и ход запуска без лаунчера

interface FakeHost extends GameHost {
  fs: Map<string, string>;
  store: Map<string, unknown>;
  responses: Map<string, string | Error>;
  launched: { id: string; options: LaunchOptions }[];
  killed: string[];
  cancelled: string[];
  alive: string[];
}

function fakeHost(init: { running?: string[] } = {}): FakeHost {
  const fs = new Map<string, string>();
  const store = new Map<string, unknown>();
  const responses = new Map<string, string | Error>();
  const launched: FakeHost['launched'] = [];
  const killed: string[] = [];
  const cancelled: string[] = [];
  const alive = [...(init.running ?? [])];
  const fetchText = async (url: string) => {
    const r = responses.get(url);
    if (r === undefined) {
      throw new Error(`TUGEN: ${url} — HTTP 404`);
    }
    if (r instanceof Error) {
      throw r;
    }
    return r;
  };
  return {
    fs,
    store,
    responses,
    launched,
    killed,
    cancelled,
    alive,
    navigation: { open: () => {}, exit: () => {} },
    files: {
      exists: p => fs.has(p) || [...fs.keys()].some(k => k.startsWith(`${p}/`)),
      readText: p => fs.get(p) ?? null,
      writeText: (p, t) => {
        fs.set(p, t);
        return true;
      },
      remove: p => {
        [...fs.keys()]
          .filter(k => k === p || k.startsWith(`${p}/`))
          .forEach(k => fs.delete(k));
        return true;
      },
      copyFolder: async () => true,
      copyFiles: async from => from.length,
      extract: async () => true,
      materialize: async objects => ({ linked: objects.length, copied: 0 }),
      markExecutable: async () => true,
      absolutePath: p => `/root/${p}`,
      openFolder: () => {},
    },
    downloads: {
      download: async (_job, files, onProgress) => {
        files.forEach(f => {
          const body = responses.get(f.url);
          fs.set(f.path, typeof body === 'string' ? body : 'bin');
        });
        onProgress?.({ done: files.length, total: files.length, bytes: 0 });
        return { downloaded: files.length, skipped: 0 };
      },
      cancel: job => {
        cancelled.push(job);
      },
    },
    process: {
      launch: (id, options) => {
        launched.push({ id, options });
        alive.push(id);
      },
      kill: id => {
        killed.push(id);
        return true;
      },
      running: () => alive,
    },
    system: {
      totalMemoryMb: () => 16384,
      locale: 'ru',
      os: 'windows',
      arch: 'x64',
    },
    net: {
      fetchText,
      fetchJson: async <T>(url: string) =>
        JSON.parse(await fetchText(url)) as T,
    },
    storage: {
      get: <T>(key: string, fallback: T) =>
        store.has(key) ? (store.get(key) as T) : fallback,
      set: (key, value) => {
        store.set(key, JSON.parse(JSON.stringify(value)));
      },
      remove: key => {
        store.delete(key);
      },
    },
  };
}

describe('настройки', () => {
  it('сохраняются, снимок стабилен до изменения', () => {
    const host = fakeHost();
    const core = createMinecraft(host);
    const listener = jest.fn();
    core.subscribe(listener);
    const before = core.getSettings();
    expect(core.getSettings()).toBe(before);
    expect(before.memoryMb).toBe(4096);

    core.setSettings({ nickname: 'Steve', memoryMb: 999999 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(core.getSettings()).not.toBe(before);
    expect(core.getSettings()).toMatchObject({
      nickname: 'Steve',
      memoryMb: 15360,
    });
    expect(createMinecraft(host).getSettings().nickname).toBe('Steve');

    // Ничего не поменялось — ни нового снимка, ни уведомления
    const same = core.getSettings();
    core.setSettings({ nickname: 'Steve' });
    expect(core.getSettings()).toBe(same);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(core.memoryRange()).toEqual({
      min: 1024,
      max: 15360,
      recommended: 4096,
    });
  });
});

describe('сборки', () => {
  it('создание, уникальные имена, основная, удаление', () => {
    const host = fakeHost();
    const core = createMinecraft(host);
    expect(core.listBuilds()).toEqual([]);
    expect(core.getMainBuildId()).toBeNull();

    const a = core.createBuild({
      name: ' Моя ',
      version: '1.21.4',
      loader: 'vanilla',
    });
    const b = core.createBuild({
      name: 'Моя',
      version: '1.21.4',
      loader: 'fabric',
      loaderVersion: '0.16.0',
    });
    const c = core.createBuild({
      name: '',
      version: '1.12.2',
      loader: 'forge',
    });
    expect([a.name, b.name, c.name]).toEqual(['Моя', 'Моя (2)', '1.12.2']);
    expect(b.loaderVersion).toBe('0.16.0');
    expect(host.fs.has(`builds/${a.id}/.keep`)).toBe(true);
    // Первая сборка становится основной сама и остаётся ею, пока игрок не выберет другую
    expect(core.getMainBuildId()).toBe(a.id);

    const list = core.listBuilds();
    expect(core.listBuilds()).toBe(list);
    core.setMainBuild(b.id);
    core.setMainBuild(a.id);
    expect(core.getMainBuildId()).toBe(a.id);
    expect(core.listBuilds()).toBe(list);

    // После перезапуска — то же самое
    const again = createMinecraft(host);
    expect(again.listBuilds().map(x => x.id)).toEqual([a.id, b.id, c.id]);
    expect(again.getMainBuildId()).toBe(a.id);

    core.removeBuild(a.id);
    expect(core.listBuilds().map(x => x.id)).toEqual([b.id, c.id]);
    expect(core.getMainBuildId()).not.toBe(a.id);
    expect(host.fs.has(`builds/${a.id}/.keep`)).toBe(false);
  });

  it('не создаёт сборки, которые не запустить', () => {
    const core = createMinecraft(fakeHost());
    expect(() =>
      core.createBuild({ name: 'x', version: '1.20.1', loader: 'neoforge' }),
    ).toThrow();
    expect(() =>
      core.createBuild({ name: 'x', version: '1.16.5', loader: 'forge' }),
    ).toThrow();
    expect(() =>
      core.createBuild({ name: 'x', version: ' ', loader: 'vanilla' }),
    ).toThrow();
    expect(core.listBuilds()).toEqual([]);
  });

  it('испорченные записи хранилища пропускаются', () => {
    const host = fakeHost();
    host.store.set('builds', [
      { id: 'ok', name: 'A', version: '1.21', loader: 'vanilla', createdAt: 1 },
      { id: 'bad', name: 'B', version: '1.21', loader: 'magic', createdAt: 2 },
      'junk',
      {
        id: 'ok',
        name: 'dup',
        version: '1.21',
        loader: 'vanilla',
        createdAt: 3,
      },
    ]);
    host.store.set('mainBuild', 'gone');
    const core = createMinecraft(host);
    expect(core.listBuilds().map(b => b.name)).toEqual(['A']);
    expect(core.getMainBuildId()).toBe('ok');
  });
});

const MANIFEST = JSON.stringify({
  latest: { release: '1.21.4', snapshot: '25w02a' },
  versions: [
    {
      id: '25w02a',
      type: 'snapshot',
      url: 'https://v/25w02a.json',
      sha1: '',
      releaseTime: 't',
    },
    {
      id: '1.21.4',
      type: 'release',
      url: 'https://v/1.21.4.json',
      sha1: '',
      releaseTime: 't',
    },
  ],
});
const MANIFEST_URL =
  'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';

describe('версии', () => {
  it('из сети с кэшем; без сети — из кэша', async () => {
    const host = fakeHost();
    host.responses.set(MANIFEST_URL, MANIFEST);
    const core = createMinecraft(host);
    expect((await core.listVersions()).map(v => v.id)).toEqual(['1.21.4']);
    expect((await core.listVersions(true)).map(v => v.id)).toEqual([
      '25w02a',
      '1.21.4',
    ]);
    expect(host.fs.get(MANIFEST_CACHE)).toBe(MANIFEST);

    const offline = fakeHost();
    offline.fs.set(MANIFEST_CACHE, MANIFEST);
    expect(
      (await createMinecraft(offline).listVersions()).map(v => v.id),
    ).toEqual(['1.21.4']);
    await expect(createMinecraft(fakeHost()).listVersions()).rejects.toThrow();
  });

  it('версии загрузчика: Fabric по Meta, неизвестная версия — пусто', async () => {
    const host = fakeHost();
    host.responses.set(
      'https://meta.fabricmc.net/v2/versions/loader/1.21.4',
      JSON.stringify([
        { loader: { version: '0.17.0-beta', stable: false } },
        { loader: { version: '0.16.0', stable: true } },
      ]),
    );
    const core = createMinecraft(host);
    expect(await core.listLoaderVersions('fabric', '1.21.4')).toEqual([
      '0.17.0-beta',
      '0.16.0',
    ]);
    expect(await core.listLoaderVersions('fabric', '0.0')).toEqual([]);
    expect(await core.listLoaderVersions('neoforge', '1.21.4')).toEqual([]);
    expect(await core.listLoaderVersions('forge', '1.21.4')).toEqual([]);
  });
});

const VANILLA: object = {
  id: '1.21.4',
  type: 'release',
  mainClass: 'net.minecraft.client.main.Main',
  libraries: [
    {
      name: 'com.mojang:brigadier:1.0.18',
      downloads: {
        artifact: { path: 'com/mojang/brigadier.jar', url: 'https://l/b.jar' },
      },
    },
  ],
  arguments: {
    game: ['--username', '${auth_player_name}'],
    jvm: ['-cp', '${classpath}'],
  },
  javaVersion: { component: 'java-runtime-delta', majorVersion: 21 },
  downloads: { client: { url: 'https://c/client.jar', sha1: 'c1', size: 1 } },
};

/** Хост, где версия и Java уже скачаны: запуск идёт без сети */
function readyHost() {
  const host = fakeHost();
  host.fs.set(versionJson('1.21.4'), JSON.stringify(VANILLA));
  host.fs.set('runtime/java-runtime-delta.sha1', 'x');
  host.fs.set('runtime/java-runtime-delta/bin/java.exe', 'bin');
  return host;
}

describe('запуск', () => {
  it('готовит, запускает, пишет журнал; вылет — failed', async () => {
    const host = readyHost();
    const core = createMinecraft(host);
    core.setSettings({ nickname: 'Steve' });
    const build = core.createBuild({
      name: 'A',
      version: '1.21.4',
      loader: 'vanilla',
    });
    const phases: string[] = [];
    core.subscribe(() => phases.push(core.getLaunchState(build.id).phase));

    await core.launch(build.id);
    expect(core.getLaunchState(build.id).phase).toBe('running');
    expect(phases).toEqual(
      expect.arrayContaining([
        'preparing',
        'downloading',
        'starting',
        'running',
      ]),
    );
    const { id, options } = host.launched[0];
    expect(id).toBe(build.id);
    expect(options.exe).toBe('runtime/java-runtime-delta/bin/java.exe');
    expect(options.cwd).toBe(`builds/${build.id}`);
    expect(options.args).toContain('-Xmx4096M');
    expect(options.args[options.args.indexOf('-cp') + 1]).toBe(
      '/root/libraries/com/mojang/brigadier.jar;/root/versions/1.21.4/1.21.4.jar',
    );
    expect(options.args.slice(-2)).toEqual(['--username', 'Steve']);
    expect(core.listBuilds()[0].lastPlayedAt).toEqual(expect.any(Number));

    // Повторный запуск запущенной — ничего не делает
    await core.launch(build.id);
    expect(host.launched).toHaveLength(1);

    options.onLog?.('[main/INFO]: hello\n');
    expect(core.getLaunchState(build.id).log).toContain('[main/INFO]: hello');
    options.onExit?.(1);
    expect(core.getLaunchState(build.id)).toMatchObject({
      phase: 'failed',
      error: 'crash',
    });
  });

  it('остановленная игроком — не вылет', async () => {
    const host = readyHost();
    const core = createMinecraft(host);
    const build = core.createBuild({
      name: 'A',
      version: '1.21.4',
      loader: 'vanilla',
    });
    await core.launch(build.id);
    core.stop(build.id);
    expect(host.killed).toEqual([build.id]);
    host.launched[0].options.onExit?.(143);
    expect(core.getLaunchState(build.id).phase).toBe('idle');
  });

  it('неверный ник и неизвестная версия — failed с кодом', async () => {
    const host = readyHost();
    const core = createMinecraft(host);
    const build = core.createBuild({
      name: 'A',
      version: '1.21.4',
      loader: 'vanilla',
    });
    core.setSettings({ nickname: 'Иван' });
    await core.launch(build.id);
    expect(core.getLaunchState(build.id)).toMatchObject({
      phase: 'failed',
      error: 'nickname',
    });

    core.setSettings({ nickname: 'Steve' });
    host.responses.set(MANIFEST_URL, MANIFEST);
    const unknown = core.createBuild({
      name: 'B',
      version: '9.9',
      loader: 'vanilla',
    });
    await core.launch(unknown.id);
    expect(core.getLaunchState(unknown.id)).toMatchObject({
      phase: 'failed',
      error: 'version',
    });
    expect(host.launched).toHaveLength(0);
  });

  it('стоп во время подготовки отменяет загрузки и не запускает игру', async () => {
    const host = readyHost();
    let release: () => void = () => {};
    host.downloads.download = (_job, files) =>
      new Promise(resolve => {
        release = () => resolve({ downloaded: files.length, skipped: 0 });
      });
    const core = createMinecraft(host);
    const build = core.createBuild({
      name: 'A',
      version: '1.21.4',
      loader: 'vanilla',
    });
    const running = core.launch(build.id);
    await new Promise(r => setTimeout(r, 0));
    expect(core.getLaunchState(build.id).phase).toBe('downloading');
    core.stop(build.id);
    expect(host.cancelled).toContain(`${build.id}:files`);
    expect(core.getLaunchState(build.id).phase).toBe('idle');
    release();
    await running;
    expect(host.launched).toHaveLength(0);
    expect(core.getLaunchState(build.id).phase).toBe('idle');
  });

  it('Fabric без версии: берёт стабильную и запоминает её', async () => {
    const host = readyHost();
    host.responses.set(
      'https://meta.fabricmc.net/v2/versions/loader/1.21.4',
      JSON.stringify([
        { loader: { version: '0.17.0-beta', stable: false } },
        { loader: { version: '0.16.0', stable: true } },
      ]),
    );
    host.responses.set(
      'https://meta.fabricmc.net/v2/versions/loader/1.21.4/0.16.0/profile/json',
      JSON.stringify({
        id: 'fabric-loader-0.16.0-1.21.4',
        type: 'release',
        inheritsFrom: '1.21.4',
        mainClass: 'net.fabricmc.loader.impl.launch.knot.KnotClient',
        libraries: [
          {
            name: 'net.fabricmc:fabric-loader:0.16.0',
            url: 'https://maven.fabricmc.net/',
          },
        ],
      }),
    );
    const core = createMinecraft(host);
    const build = core.createBuild({
      name: 'F',
      version: '1.21.4',
      loader: 'fabric',
    });
    await core.launch(build.id);
    expect(core.getLaunchState(build.id).phase).toBe('running');
    expect(core.listBuilds()[0].loaderVersion).toBe('0.16.0');
    const args = host.launched[0].options.args;
    expect(args).toContain('net.fabricmc.loader.impl.launch.knot.KnotClient');
    expect(args[args.indexOf('-cp') + 1]).toMatch(
      /^\/root\/libraries\/net\/fabricmc\/fabric-loader\/0\.16\.0\/fabric-loader-0\.16\.0\.jar;/,
    );
  });

  it('игра из прошлого сеанса — запущена, удалить нельзя, стоп сразу idle', () => {
    const host = fakeHost();
    host.store.set('builds', [
      { id: 'b1', name: 'A', version: '1.21', loader: 'vanilla', createdAt: 1 },
    ]);
    host.alive.push('b1', 'other');
    const core = createMinecraft(host);
    expect(core.getLaunchState('b1').phase).toBe('running');
    expect(core.getLaunchState('other').phase).toBe('idle');
    expect(() => core.removeBuild('b1')).toThrow();
    core.stop('b1');
    expect(host.killed).toEqual(['b1']);
    expect(core.getLaunchState('b1').phase).toBe('idle');
  });
});
