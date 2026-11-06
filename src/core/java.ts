import type { DownloadFile, GameHost } from '@tugen/sdk';
import type { GamePlatform } from './platform';

// Java от Mojang: та же, что ставит официальный лаунчер. Каждой версии игры нужен свой компонент
// (javaVersion.component: jre-legacy — Java 8, java-runtime-delta — Java 21…). Компонент
// скачивается один раз в runtime/<компонент> и общий для всех сборок — ставить Java самому не нужно

const RUNTIMES =
  'https://piston-meta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json';
// Нужного компонента под систему нет — Java 8 подходит самым старым версиям
const FALLBACK = 'jre-legacy';

interface RuntimeFile {
  type: 'file' | 'directory' | 'link';
  /** macOS: файл запускается (java, jspawnhelper) — после загрузки ему нужно право на запуск */
  executable?: boolean;
  downloads?: { raw?: { url: string; sha1: string; size: number } };
}

export type RuntimeEntry = { manifest: { url: string; sha1: string } };

export type Runtimes = Record<string, Record<string, RuntimeEntry[]>>;

/** Путь к java компонента внутри папки игры */
export const javaPath = (component: string, platform: GamePlatform) =>
  `runtime/${component}/${platform.javaBinary}`;

// Рядом с компонентом — SHA-1 его манифеста: есть метка и java — компонент целый, сеть не нужна
const marker = (component: string) => `runtime/${component}.sha1`;

/**
 * Сборка компонента в каталоге: под свою платформу, иначе под запасную. null — нет ни там, ни там
 */
export function pickRuntime(
  runtimes: Runtimes,
  component: string,
  platform: GamePlatform,
): RuntimeEntry | null {
  const fallback = platform.javaFallbackPlatform;
  return (
    runtimes[platform.javaPlatform]?.[component]?.[0] ??
    (fallback ? runtimes[fallback]?.[component]?.[0] : undefined) ??
    null
  );
}

export interface JavaPlan {
  component: string;
  files: DownloadFile[];
  sha1: string;
  /** Файлы, которым после загрузки нужно право на запуск (macOS) */
  executables: string[];
}

const installed = (host: GameHost, component: string, platform: GamePlatform) =>
  host.files.exists(marker(component)) &&
  host.files.exists(javaPath(component, platform));

/** Что скачать для компонента; null — он уже целиком на диске */
export async function javaFiles(
  host: GameHost,
  wanted: string,
  platform: GamePlatform,
): Promise<JavaPlan | null> {
  if (installed(host, wanted, platform)) {
    return null;
  }
  const runtimes = await host.net.fetchJson<Runtimes>(RUNTIMES);
  const component = pickRuntime(runtimes, wanted, platform) ? wanted : FALLBACK;
  if (component !== wanted && installed(host, component, platform)) {
    return { component, files: [], sha1: '', executables: [] };
  }
  const entry = pickRuntime(runtimes, component, platform);
  if (!entry) {
    throw new Error(`no java runtime ${wanted}`);
  }
  const manifest = await host.net.fetchJson<{
    files: Record<string, RuntimeFile>;
  }>(entry.manifest.url);
  const files: DownloadFile[] = [];
  const executables: string[] = [];
  for (const [name, file] of Object.entries(manifest.files ?? {})) {
    const raw = file.type === 'file' ? file.downloads?.raw : undefined;
    if (raw) {
      const path = `runtime/${component}/${name}`;
      files.push({ url: raw.url, path, sha1: raw.sha1, size: raw.size });
      if (file.executable) {
        executables.push(path);
      }
    }
  }
  return { component, files, sha1: entry.manifest.sha1, executables };
}

/**
 * Компонент скачан целиком — дать право на запуск (на Windows его нет, и SDK это знает) и
 * запомнить, чтобы следующий запуск не проверял его по сети
 */
export async function markJava(host: GameHost, plan: JavaPlan): Promise<void> {
  if (plan.executables.length) {
    await host.files.markExecutable(plan.executables);
  }
  if (plan.sha1) {
    host.files.writeText(marker(plan.component), plan.sha1);
  }
}
