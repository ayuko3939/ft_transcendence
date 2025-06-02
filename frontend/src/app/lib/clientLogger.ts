import type { SimpleLogContext } from "@/lib/logger";

// クライアントサイドでのみ動作
const isClient = typeof window !== 'undefined';

// ベースログ送信関数
async function sendLog(level: 'info' | 'warn' | 'error', message: string, context?: SimpleLogContext): Promise<void> {
  // サーバーサイドでは何もしない
  if (!isClient) return;

  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        level,
        message,
        context,
      }),
    });
  } catch (error) {
    // ログ送信エラーはコンソールに出力（デバッグ用）
    console.error('ログ送信に失敗しました:', error);
  }
}

// 公開ログ関数
export function clientLogInfo(message: string, context?: SimpleLogContext): void {
  sendLog('info', message, context);
}

export function clientLogWarn(message: string, context?: SimpleLogContext): void {
  sendLog('warn', message, context);
}

export function clientLogError(message: string, context?: SimpleLogContext): void {
  sendLog('error', message, context);
}

// よく使うパターンの便利関数
export function logUserAction(action: string, userId?: string): void {
  clientLogInfo(`ユーザーアクション: ${action}`, { userId });
}

export function logButtonClick(buttonName: string, userId?: string): void {
  clientLogInfo(`ボタンクリック: ${buttonName}`, { userId });
}

export function logPageView(pageName: string, userId?: string): void {
  clientLogInfo(`ページ表示: ${pageName}`, { userId });
}
