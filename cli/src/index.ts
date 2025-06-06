#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import inquirer from "inquirer";
import * as colors from "colors/safe";
import { AuthClient } from "./auth";
import { GameClient } from "./game-client";
import { GameUI } from "./game-ui";
import { getConfig, createConfig } from "./config";
import type { UserSession, CLIConfig, AuthCredentials } from "./types";

class PongCLI {
  private config: CLIConfig;
  private authClient: AuthClient;
  private userSession: UserSession | null = null;
  private gameClient: GameClient | null = null;
  private gameUI: GameUI | null = null;
  private gameEndTimer: NodeJS.Timeout | null = null;

  constructor(config: CLIConfig) {
    this.config = config;
    this.authClient = new AuthClient(config);
  }

  /**
   * CLI アプリケーションのメインエントリーポイント
   */
  public async run(): Promise<void> {
    this.userSession = null;
    try {
      // メインメニュー
      while (true) {
        process.stdout.write("\x1b[2J\x1b[0f"); // ANSI escape sequences
        console.clear();
        console.log(colors.bold(colors.cyan("🏓 Pong CLI Game へようこそ！")));
        console.log(colors.gray(`サーバー: ${this.config.serverUrl}`));
        console.log();

        if (!this.userSession) {
          this.userSession = await this.login();
          if (!this.userSession) {
            console.log(colors.red("❌ ログインに失敗しました"));
            return;
          }
          console.log(
            colors.green(`✅ ログイン成功: ${this.userSession.username}`)
          );
        }
        console.log();

        const action = await this.showMainMenu();
        switch (action) {
          case "random":
            await this.joinRandomGame();
            break;
          case "exit":
            await this.cleanup();
            return;
        }
      }
    } catch (error) {
      console.error(colors.red("🚨 エラーが発生しました:"), error);
      process.exit(1);
    }
  }

  /**
   * ログイン処理
   */
  private async login(): Promise<UserSession> {
    const credentials = await this.getCredentials();

    try {
      console.log(colors.yellow("🔐 認証中..."));
      const fetchedSession = await this.authClient.login(credentials);
      return fetchedSession;
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
        type: "input",
        name: "email",
        message: "メールアドレス:",
        validate: (input: string) => {
          if (!input.trim()) return "メールアドレスを入力してください";
          if (!input.includes("@"))
            return "有効なメールアドレスを入力してください";
          return true;
        },
      },
      {
        type: "password",
        name: "password",
        message: "パスワード:",
        validate: (input: string) => {
          if (!input.trim()) return "パスワードを入力してください";
          return true;
        },
      },
    ]);

    return {
      email: answers.email.trim(),
      password: answers.password,
    };
  }

  /**
   * メインメニュー
   */
  private async showMainMenu(): Promise<string> {
    try {
      const answer = await inquirer.prompt([
        {
          type: "list",
          name: "action",
          message: "何をしますか？",
          choices: [
            { name: "🎮 ランダムマッチに参加", value: "random" },
            { name: "❌ 終了", value: "exit" },
          ],
        },
      ]);
      return answer.action;
    } catch (error: any) {
      // ExitPromptErrorの場合は正常終了として扱う
      if (error?.name === "ExitPromptError") {
        return "exit";
      }
      throw error;
    }
  }

  /**
   * ランダムマッチに参加
   */
  private async joinRandomGame(): Promise<void> {
    console.log(colors.yellow("🔍 ランダムマッチを検索中..."));
    await this.startGame();
  }

  /**
   * ゲームを開始
   */
  private async startGame(roomId?: string): Promise<void> {
    if (!this.userSession) {
      console.log(colors.red("❌ セッションが無効です"));
      return;
    }

    // session の型安全性を確保
    const session = this.userSession;

    // ゲーム終了を待機するためのPromise
    return new Promise<void>((resolve, reject) => {
      try {
        // 画面を完全にクリアしてメニューを消去
        process.stdout.write("\x1b[2J\x1b[0f");
        console.clear();

        // UI を初期化
        this.gameUI = new GameUI();

        // ゲームクライアントを初期化
        this.gameClient = new GameClient(this.config, session, {
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
            // 5秒後にゲーム終了処理とPromise解決（タイマー管理）
            this.gameEndTimer = setTimeout(() => {
              this.clearGameEndTimer();
              this.endGame();
              resolve(); // ここでPromiseを解決
            }, 5000);
          },
          onWaitingForPlayer: () => {
            this.gameUI?.onWaitingForPlayer();
          },
          onError: (error) => {
            this.gameUI?.showError(error);
            this.clearGameEndTimer();
            setTimeout(() => {
              this.endGame();
              reject(new Error(error)); // エラーの場合はreject
            }, 2000);
          },
          onDisconnected: () => {
            this.clearGameEndTimer();
            setTimeout(() => {
              this.endGame();
              resolve(); // 切断時もPromiseを解決
            }, 1000);
          },
        });

        // UI イベントハンドラーを設定
        this.gameUI.onPaddleMove = (y) => {
          this.gameClient?.movePaddle(y);
        };

        this.gameUI.onQuit = () => {
          this.clearGameEndTimer();
          this.endGame();
          resolve(); // 手動終了時もPromiseを解決
        };

        // WebSocket 接続（非同期）
        this.gameClient
          .connect(roomId)
          .then(() => {
            // UIレンダリング開始
            this.gameUI?.render();
          })
          .catch((error) => {
            reject(error);
          });
      } catch (error) {
        console.error(
          colors.red("🚨 接続に失敗しました:"),
          (error as Error).message
        );

        // エラーメッセージを表示して待機
        this.clearGameEndTimer();
        setTimeout(() => {
          this.endGame();
          reject(error);
        }, 2000);
      }
    });
  }

  /**
   * ゲーム終了タイマーをクリア
   */
  private clearGameEndTimer(): void {
    if (this.gameEndTimer) {
      clearTimeout(this.gameEndTimer);
      this.gameEndTimer = null;
    }
  }

  /**
   * ゲームを終了してメニューに戻る
   */
  private endGame(): void {
    // タイマーをクリア（念のため）
    this.clearGameEndTimer();

    // GameClientを安全に切断
    if (this.gameClient) {
      try {
        this.gameClient.disconnect();
      } catch (error) {
        console.error("GameClient disconnect error:", error);
      }
      this.gameClient = null;
    }

    // GameUIを安全に破棄
    if (this.gameUI) {
      try {
        this.gameUI.destroy();
      } catch (error) {
        console.error("GameUI destroy error:", error);
      }
      this.gameUI = null;
    }

    // ターミナルの状態を完全にリセット
    try {
      this.resetTerminal();
    } catch (error) {
      console.error("Terminal reset error:", error);
    }
    
    console.log(colors.cyan("🏓 メインメニューに戻ります..."));
  }

  /**
   * ターミナル状態をリセット
   */
  private resetTerminal(): void {
    try {
      // 標準入力を通常モードに戻す
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
    } catch (error) {
      console.error("Failed to reset raw mode:", error);
    }

    try {
      // カーソルを表示
      process.stdout.write('\x1b[?25h');
    } catch (error) {
      console.error("Failed to show cursor:", error);
    }

    try {
      // 通常のスクリーンバッファに戻る
      process.stdout.write('\x1b[?1049l');
    } catch (error) {
      console.error("Failed to restore screen buffer:", error);
    }

    try {
      // 画面をクリア
      console.clear();
    } catch (error) {
      console.error("Failed to clear screen:", error);
    }
  }

  /**
   * リソースをクリーンアップ
   */
  private async cleanup(): Promise<void> {
    try {
      this.endGame();
    } catch (error) {
      console.error("Error during game cleanup:", error);
    }
    try {
      this.resetTerminal();
    } catch (error) {
      console.error("Error during terminal reset:", error);
    }

    console.log(colors.cyan("👋 ご利用ありがとうございました！"));
  }
}

// CLI 引数の解析
async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option("server", {
      alias: "s",
      description: "サーバーURL",
      type: "string",
    })
    .option("auth", {
      alias: "a",
      description: "認証API URL",
      type: "string",
    })
    .option("ws", {
      alias: "w",
      description: "WebSocket URL",
      type: "string",
    })
    .option("dev", {
      alias: "d",
      description: "開発モード",
      type: "boolean",
      default: false,
    })
    .help()
    .version("1.0.0")
    .usage("$0 [options]")
    .example("$0", "デフォルト設定でPong CLIを起動")
    .example("$0 --dev", "開発モードで起動")
    .example("$0 -s http://example.com", "カスタムサーバーURLで起動").argv;

  // 設定を作成
  const configOverrides: Partial<CLIConfig> = {};

  if (argv.dev) {
    process.env.NODE_ENV = "development";
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

  const config =
    Object.keys(configOverrides).length > 0
      ? createConfig(configOverrides)
      : getConfig();

  // CLI アプリケーションを起動
  const cli = new PongCLI(config);
  await cli.run();
}

// エラーハンドリング
process.on("unhandledRejection", (reason, promise) => {
  // ExitPromptErrorは正常な終了なので無視
  if (
    reason &&
    typeof reason === "object" &&
    "name" in reason &&
    reason.name === "ExitPromptError"
  ) {
    process.exit(0);
  }
  console.error(
    colors.red("🚨 Unhandled Rejection at:"),
    promise,
    colors.red("reason:"),
    reason
  );
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  // ExitPromptErrorは正常な終了なので無視
  if (error.name === "ExitPromptError") {
    process.exit(0);
  }
  console.error(colors.red("🚨 Uncaught Exception:"), error);
  process.exit(1);
});

// Ctrl+C での正常終了
process.on("SIGINT", () => {
  try {
    // ターミナル状態をリセット
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdout.write('\x1b[?25h'); // カーソル表示
    process.stdout.write('\x1b[?1049l'); // 通常スクリーンバッファ
  } catch (error) {
    console.error("Error during SIGINT cleanup:", error);
  }
  console.log("\n👋 CLIを終了します...");
  process.exit(0);
});

// メイン関数を実行
if (require.main === module) {
  process.stdout.write("\x1b[2J\x1b[0f"); // ANSI escape sequences
  console.clear();
  main().catch((error) => {
    console.error(colors.red("🚨 Fatal error:"), error);
    process.exit(1);
  });
}

export { PongCLI };
