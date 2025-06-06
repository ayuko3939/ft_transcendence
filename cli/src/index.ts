#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import inquirer from 'inquirer';
import * as colors from 'colors/safe';
import { AuthClient } from './auth';
import { GameClient } from './game-client';
import { GameUI } from './game-ui';
import { getConfig, createConfig } from './config';
import type { UserSession, CLIConfig, AuthCredentials } from './types';

class PongCLI {
  private config: CLIConfig;
  private authClient: AuthClient;
  private session: UserSession | null = null;
  private gameClient: GameClient | null = null;
  private gameUI: GameUI | null = null;

  constructor(config: CLIConfig) {
    this.config = config;
    this.authClient = new AuthClient(config);
  }

  /**
   * CLI アプリケーションのメインエントリーポイント
   */
  public async run(): Promise<void> {
    try {
      console.log(colors.bold(colors.cyan('🏓 Pong CLI Game へようこそ！')));
      console.log(colors.gray(`サーバー: ${this.config.serverUrl}`));
      console.log();

      // ログイン処理
      await this.login();

      if (!this.session) {
        console.log(colors.red('❌ ログインに失敗しました'));
        return;
      }

      console.log(colors.green(`✅ ログイン成功: ${this.session.username}`));
      console.log();

      // メインメニュー
      await this.showMainMenu();

    } catch (error) {
      console.error(colors.red('🚨 エラーが発生しました:'), error);
      process.exit(1);
    }
  }

  /**
   * ログイン処理
   */
  private async login(): Promise<void> {
    const credentials = await this.getCredentials();
    
    try {
      console.log(colors.yellow('🔐 認証中...'));
      this.session = await this.authClient.login(credentials);
    } catch (error) {
      throw new Error(`認証エラー: ${error}`);
    }
  }

  /**
   * 認証情報を取得
   */
  private async getCredentials(): Promise<AuthCredentials> {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'email',
        message: 'メールアドレス:',
        validate: (input: string) => {
          if (!input.trim()) return 'メールアドレスを入力してください';
          if (!input.includes('@')) return '有効なメールアドレスを入力してください';
          return true;
        }
      },
      {
        type: 'password',
        name: 'password',
        message: 'パスワード:',
        validate: (input: string) => {
          if (!input.trim()) return 'パスワードを入力してください';
          return true;
        }
      }
    ]);

    return {
      email: answers.email.trim(),
      password: answers.password
    };
  }

  /**
   * メインメニュー
   */
  private async showMainMenu(): Promise<void> {
    while (true) {
      const answer = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: '何をしますか？',
          choices: [
            { name: '🎮 ランダムマッチに参加', value: 'random' },
            { name: '🏠 ルームに参加 (ルームID指定)', value: 'room' },
            { name: '🚪 ログアウト', value: 'logout' },
            { name: '❌ 終了', value: 'exit' }
          ]
        }
      ]);

      switch (answer.action) {
        case 'random':
          await this.joinRandomGame();
          break;
        case 'room':
          await this.joinSpecificRoom();
          break;
        case 'logout':
          await this.logout();
          return;
        case 'exit':
          await this.cleanup();
          return;
      }
    }
  }

  /**
   * ランダムマッチに参加
   */
  private async joinRandomGame(): Promise<void> {
    console.log(colors.yellow('🔍 ランダムマッチを検索中...'));
    await this.startGame();
  }

  /**
   * 特定のルームに参加
   */
  private async joinSpecificRoom(): Promise<void> {
    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'roomId',
        message: 'ルームID:',
        validate: (input: string) => {
          if (!input.trim()) return 'ルームIDを入力してください';
          return true;
        }
      }
    ]);

    console.log(colors.yellow(`🏠 ルーム "${answer.roomId}" に参加中...`));
    await this.startGame(answer.roomId.trim());
  }

  /**
   * ゲームを開始
   */
  private async startGame(roomId?: string): Promise<void> {
    if (!this.session) {
      console.log(colors.red('❌ セッションが無効です'));
      return;
    }

    console.log(colors.yellow('🎮 ゲームを開始します...'));

    try {
      // UI を初期化
      this.gameUI = new GameUI();
      
      // ゲームクライアントを初期化
      this.gameClient = new GameClient(this.config, this.session, {
        onInit: (side, state, roomId) => {
          this.gameUI?.onGameInit(side, state, roomId);
        },
        onGameState: (state) => {
          this.gameUI?.onGameStateUpdate(state);
        },
        onCountdown: (count) => {
          this.gameUI?.onCountdown(count);
        },
        onGameStart: (state) => {
          this.gameUI?.onGameStateUpdate(state);
        },
        onGameOver: (result) => {
          this.gameUI?.onGameOver(result);
          // 5秒後にメニューに戻る
          setTimeout(() => {
            this.endGame();
          }, 5000);
        },
        onChatUpdate: (messages) => {
          this.gameUI?.onChatUpdate(messages);
        },
        onWaitingForPlayer: () => {
          this.gameUI?.onWaitingForPlayer();
        },
        onError: (error) => {
          this.gameUI?.showError(error);
        },
        onDisconnected: () => {
          setTimeout(() => {
            this.endGame();
          }, 1000); // 1秒待ってからメニューに戻る
        }
      });

      // UI イベントハンドラーを設定
      this.gameUI.onPaddleMove = (y) => {
        this.gameClient?.movePaddle(y);
      };

      this.gameUI.onSendChat = (message) => {
        this.gameClient?.sendChat(message);
      };

      this.gameUI.onSurrender = () => {
        this.gameClient?.surrender();
      };

      this.gameUI.onQuit = () => {
        this.endGame();
      };

      // WebSocket 接続
      await this.gameClient.connect(roomId);

      // UIレンダリング開始
      this.gameUI.render();

    } catch (error) {
      console.error(colors.red('🚨 接続に失敗しました:'), (error as Error).message);
      
      // エラーメッセージを表示して待機
      setTimeout(() => {
        this.endGame();
      }, 2000);
    }
  }

  /**
   * ゲームを終了してメニューに戻る
   */
  private endGame(): void {
    if (this.gameClient) {
      this.gameClient.disconnect();
      this.gameClient = null;
    }

    if (this.gameUI) {
      this.gameUI.destroy();
      this.gameUI = null;
    }

    console.clear();
    console.log(colors.cyan('🏓 メインメニューに戻ります...'));
  }

  /**
   * ログアウト
   */
  private async logout(): Promise<void> {
    if (this.session) {
      try {
        await this.authClient.logout(this.session.sessionToken);
        console.log(colors.green('✅ ログアウトしました'));
      } catch (error) {
        console.log(colors.yellow('⚠️  ログアウト時にエラーが発生しました'));
      }
      this.session = null;
    }
  }

  /**
   * リソースをクリーンアップ
   */
  private async cleanup(): Promise<void> {
    this.endGame();
    await this.logout();
    console.log(colors.cyan('👋 ご利用ありがとうございました！'));
  }
}

// CLI 引数の解析
async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option('server', {
      alias: 's',
      description: 'サーバーURL',
      type: 'string'
    })
    .option('auth', {
      alias: 'a',
      description: '認証API URL',
      type: 'string'
    })
    .option('ws', {
      alias: 'w',
      description: 'WebSocket URL',
      type: 'string'
    })
    .option('dev', {
      alias: 'd',
      description: '開発モード',
      type: 'boolean',
      default: false
    })
    .help()
    .version('1.0.0')
    .usage('$0 [options]')
    .example('$0', 'デフォルト設定でPong CLIを起動')
    .example('$0 --dev', '開発モードで起動')
    .example('$0 -s http://example.com', 'カスタムサーバーURLで起動')
    .argv;

  // 設定を作成
  const configOverrides: Partial<CLIConfig> = {};
  
  if (argv.dev) {
    process.env.NODE_ENV = 'development';
  }
  
  if (argv.server) {
    configOverrides.serverUrl = argv.server;
  }
  
  if (argv.auth) {
    configOverrides.authUrl = argv.auth;
  }
  
  if (argv.ws) {
    configOverrides.wsUrl = argv.ws;
  }

  const config = Object.keys(configOverrides).length > 0 
    ? createConfig(configOverrides)
    : getConfig();

  // CLI アプリケーションを起動
  const cli = new PongCLI(config);
  await cli.run();
}

// エラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  console.error(colors.red('🚨 Unhandled Rejection at:'), promise, colors.red('reason:'), reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(colors.red('🚨 Uncaught Exception:'), error);
  process.exit(1);
});

// メイン関数を実行
if (require.main === module) {
  main().catch((error) => {
    console.error(colors.red('🚨 Fatal error:'), error);
    process.exit(1);
  });
}

export { PongCLI };