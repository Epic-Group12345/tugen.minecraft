// Система, на которой запускается игра. От неё зависят правила библиотек в описании версии, сборка
// Java от Mojang, путь к java и разделитель classpath. В лаунчере это был модульный SYSTEM из
// Platform.OS; здесь — значение из host.system, которое передаётся явно: так ядро тестируется под
// любую систему без подмены модулей

export interface GamePlatform {
  /** os.name в правилах описания версии Mojang */
  name: 'windows' | 'osx';
  /** os.arch в правилах */
  arch: 'x86_64' | 'arm64';
  version: string;
  /** Платформа в каталоге Java от Mojang; запасная — когда под основную компонента нет */
  javaPlatform: string;
  javaFallbackPlatform?: string;
  /** Путь к java внутри папки компонента */
  javaBinary: string;
  classpathSeparator: ';' | ':';
}

export function platformFor(
  os: 'windows' | 'macos',
  arch: 'x64' | 'arm64',
): GamePlatform {
  const arm = arch === 'arm64';
  if (os === 'macos') {
    // Java 8 и 16 под Apple Silicon Mojang не собирает — они идут через Rosetta (mac-os)
    return {
      name: 'osx',
      arch: arm ? 'arm64' : 'x86_64',
      version: '14.0',
      javaPlatform: arm ? 'mac-os-arm64' : 'mac-os',
      javaFallbackPlatform: arm ? 'mac-os' : undefined,
      javaBinary: 'jre.bundle/Contents/Home/bin/java',
      classpathSeparator: ':',
    };
  }
  // Windows на ARM: свои сборки Java есть не у всех компонентов — остальные идут через эмуляцию x64
  return {
    name: 'windows',
    arch: arm ? 'arm64' : 'x86_64',
    version: '10.0',
    javaPlatform: arm ? 'windows-arm64' : 'windows-x64',
    javaFallbackPlatform: arm ? 'windows-x64' : undefined,
    javaBinary: 'bin/java.exe',
    classpathSeparator: ';',
  };
}
