/**
 * Logger-Klasse für einheitliches Logging innerhalb der Anwendung
 * Unterstützt verschiedene Log-Level: debug, info, warn und error
 */

// Definieren der verfügbaren Log-Level
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

interface LoggerOptions {
  level: LogLevel;
  prefix?: string;
  includeTimestamp?: boolean;
}

export class Logger {
  private level: LogLevel;
  private prefix: string;
  private includeTimestamp: boolean;

  constructor(options: LoggerOptions = { level: LogLevel.INFO }) {
    this.level = options.level;
    this.prefix = options.prefix || '';
    this.includeTimestamp = options.includeTimestamp !== undefined ? options.includeTimestamp : true;
  }

  /**
   * Erstellt einen formatierten Log-Eintrag
   */
  private formatMessage(level: string, message: string, ...args: any[]): string {
    let formattedMessage = '';
    
    // Zeitstempel hinzufügen
    if (this.includeTimestamp) {
      const timestamp = new Date().toISOString();
      formattedMessage += `[${timestamp}] `;
    }
    
    // Level und Prefix
    formattedMessage += `[${level}]`;
    if (this.prefix) {
      formattedMessage += ` [${this.prefix}]`;
    }
    
    formattedMessage += ` ${message}`;
    
    return formattedMessage;
  }

  /**
   * Loggt Debug-Informationen
   */
  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      if (args.length > 0 && typeof args[0] === 'object') {
        console.debug(this.formatMessage('DEBUG', message), ...args);
      } else {
        console.debug(this.formatMessage('DEBUG', message, ...args));
      }
    }
  }

  /**
   * Loggt allgemeine Informationen
   */
  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      if (args.length > 0 && typeof args[0] === 'object') {
        console.info(this.formatMessage('INFO', message), ...args);
      } else {
        console.info(this.formatMessage('INFO', message, ...args));
      }
    }
  }

  /**
   * Loggt Warnungen
   */
  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      if (args.length > 0 && typeof args[0] === 'object') {
        console.warn(this.formatMessage('WARN', message), ...args);
      } else {
        console.warn(this.formatMessage('WARN', message, ...args));
      }
    }
  }

  /**
   * Loggt Fehler
   */
  error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      // Stelle sicher, dass das erste Argument ein Objekt ist und nicht leer ist
      if (args.length > 0) {
        // Wenn das erste Argument ein Error-Objekt ist, konvertiere es
        if (args[0] instanceof Error) {
          args[0] = {
            message: args[0].message,
            stack: args[0].stack,
            name: args[0].name
          };
        } 
        // Wenn das erste Argument ein leeres Objekt ist, setze einen Standardwert
        else if (typeof args[0] === 'object' && Object.keys(args[0]).length === 0) {
          args[0] = { info: 'Kein detaillierter Fehler verfügbar' };
        }
        // Logge Nachricht und Fehlerobjekt
        console.error(this.formatMessage('ERROR', message), ...args);
      } else {
        // Wenn keine zusätzlichen Argumente vorhanden sind, nur die Nachricht loggen
        console.error(this.formatMessage('ERROR', message));
      }
    }
  }

  /**
   * Ändert das Log-Level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Ändert den Prefix
   */
  setPrefix(prefix: string): void {
    this.prefix = prefix;
  }
}

// Standard-Logger-Instanz exportieren
export const logger = new Logger({
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  includeTimestamp: true
});

// Logger mit anpassbarer Konfiguration
export function createLogger(options: LoggerOptions): Logger {
  return new Logger(options);
} 