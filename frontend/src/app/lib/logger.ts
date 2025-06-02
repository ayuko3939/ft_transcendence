import { appendFileSync } from 'fs';

// 最小限のログコンテキスト
export interface SimpleLogContext {
  method?: string;
  url?: string;
  statusCode?: number;
  userId?: string;
  error?: string;
}

// ログレベルの型定義
type LogLevel = 'info' | 'warn' | 'error';

// サーバーサイドでのみログ出力を実行
const isServer = typeof window === 'undefined';
const LOG_FILE_PATH = '/logs/frontend.log';

// ベースログ関数
function writeLog(level: LogLevel, message: string, context?: SimpleLogContext): void {
  // ブラウザサイドでは何もしない
  if (!isServer) return;

  try {
    const logEntry = {
      level,
      time: new Date().toISOString(),
      msg: message,
      ...context,
    };

    // JSONニューライン形式で出力
    appendFileSync(LOG_FILE_PATH, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    // ログ出力自体のエラーはコンソールに出力
    console.error('Failed to write log:', error);
  }
}

// 公開ログ関数
export function logInfo(message: string, context?: SimpleLogContext): void {
  writeLog('info', message, context);
}

export function logWarn(message: string, context?: SimpleLogContext): void {
  writeLog('warn', message, context);
}

export function logError(message: string, error?: Error, context?: SimpleLogContext): void {
  const errorContext = error ? {
    ...context,
    error: `${error.name}: ${error.message}`,
  } : context;
  
  writeLog('error', message, errorContext);
}

// API用の便利関数
export function logApiRequest(method: string, url: string, statusCode: number, userId?: string): void {
  logInfo(`${method} ${url} - ${statusCode}`, {
    method,
    url,
    statusCode,
    userId,
  });
}

export function logApiError(method: string, url: string, error: Error, userId?: string): void {
  logError(`${method} ${url} - API Error`, error, {
    method,
    url,
    statusCode: 500,
    userId,
  });
}
