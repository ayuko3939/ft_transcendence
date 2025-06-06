import type { CLIConfig } from './types';

// デフォルト設定（本番環境用）
export const DEFAULT_CONFIG: CLIConfig = {
  // Nginx経由でアクセス
  serverUrl: 'http://localhost',
  wsUrl: 'ws://localhost/api/game',
  authUrl: 'http://localhost/api/auth'
};

// 開発環境用設定
export const DEV_CONFIG: CLIConfig = {
  // 直接バックエンドにアクセス
  serverUrl: 'http://localhost:3001',
  wsUrl: 'ws://localhost:3001/game',
  authUrl: 'http://localhost:3000/api/auth'
};

/**
 * 環境に応じた設定を取得
 */
export function getConfig(): CLIConfig {
  const isDev = process.env.NODE_ENV === 'development' || process.env.DEV === 'true';
  return isDev ? DEV_CONFIG : DEFAULT_CONFIG;
}

/**
 * カスタム設定で上書き
 */
export function createConfig(options: Partial<CLIConfig>): CLIConfig {
  const baseConfig = getConfig();
  return {
    ...baseConfig,
    ...options
  };
}