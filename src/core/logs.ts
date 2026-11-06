// Журнал игры: вывод процесса → строки с уровнем. Игра пишет журнал через log4j; с настройкой
// журнала от Mojang (logging.client в версии) — событиями XML, из них берём время, поток, уровень
// и текст. Всё, что не XML (печать в stdout, старые версии), — обычными строками, уровень угадываем

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'launcher';

export interface LogLine {
  /** Сквозной номер строки — ключ списка */
  key: number;
  level: LogLevel;
  text: string;
}

const EVENT_OPEN = '<log4j:Event';
const EVENT_CLOSE = '</log4j:Event>';
// Незакрытое событие длиннее этого — не XML, а мусор: отдаём как есть
const MAX_PENDING = 1_048_576;

const LEVELS: Record<string, LogLevel> = {
  FATAL: 'error',
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'debug',
};

const attr = (tag: string, name: string) =>
  tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? '';

const cdata = (xml: string, tag: string) => {
  const m = xml.match(
    new RegExp(
      `<log4j:${tag}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</log4j:${tag}>`,
    ),
  );
  return m ? m[1] ?? unescapeXml(m[2] ?? '') : '';
};

const unescapeXml = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

const pad = (n: number) => String(n).padStart(2, '0');

const clock = (ms: number) => {
  const d = new Date(ms);
  return Number.isNaN(d.getTime())
    ? ''
    : `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/** Уровень обычной строки — по слову уровня в ней */
export const guessLevel = (line: string): LogLevel =>
  /\b(ERROR|FATAL|SEVERE)\b|Exception|^\s+at\s/.test(line)
    ? 'error'
    : /\bWARN(ING)?\b/.test(line)
    ? 'warn'
    : 'info';

export class LogParser {
  private pending = '';

  /** Очередной кусок вывода → готовые строки (без номеров: их ставит хранилище журнала) */
  feed(chunk: string): Omit<LogLine, 'key'>[] {
    this.pending += chunk.replace(/\r\n?/g, '\n');
    const out: Omit<LogLine, 'key'>[] = [];
    for (;;) {
      const start = this.pending.indexOf(EVENT_OPEN);
      if (start < 0) {
        // Без события: отдаём целые строки, недописанную оставляем на потом
        const cut = this.pending.lastIndexOf('\n');
        if (cut >= 0) {
          this.plain(this.pending.slice(0, cut), out);
          this.pending = this.pending.slice(cut + 1);
        }
        break;
      }
      if (start > 0) {
        this.plain(this.pending.slice(0, start), out);
        this.pending = this.pending.slice(start);
        continue;
      }
      const end = this.pending.indexOf(EVENT_CLOSE);
      if (end < 0) {
        if (this.pending.length > MAX_PENDING) {
          this.plain(this.pending, out);
          this.pending = '';
        }
        break;
      }
      this.event(this.pending.slice(0, end + EVENT_CLOSE.length), out);
      this.pending = this.pending.slice(end + EVENT_CLOSE.length);
    }
    return out;
  }

  /** Остаток после выхода игры */
  flush(): Omit<LogLine, 'key'>[] {
    const out: Omit<LogLine, 'key'>[] = [];
    this.plain(this.pending, out);
    this.pending = '';
    return out;
  }

  private plain(text: string, out: Omit<LogLine, 'key'>[]) {
    for (const line of text.split('\n')) {
      if (line.trim()) {
        out.push({ level: guessLevel(line), text: line });
      }
    }
  }

  private event(xml: string, out: Omit<LogLine, 'key'>[]) {
    const tag = xml.slice(0, xml.indexOf('>') + 1);
    const level = LEVELS[attr(tag, 'level').toUpperCase()] ?? 'info';
    const time = clock(Number(attr(tag, 'timestamp')));
    const thread = unescapeXml(attr(tag, 'thread'));
    const head = `[${time}] [${thread}/${attr(tag, 'level')}]: `;
    const message = cdata(xml, 'Message');
    message
      .split('\n')
      .forEach((line, i) =>
        out.push({ level, text: i === 0 ? head + line : line }),
      );
    const throwable = cdata(xml, 'Throwable');
    for (const line of throwable.split('\n')) {
      if (line.trim()) {
        out.push({ level: 'error', text: line });
      }
    }
  }
}
