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
import { exit } from "process";

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
    // イベントハンドラーを定義
    const unhandledRejectionHandler = (reason: any, promise: Promise<any>) => {
      // ExitPromptErrorは正常な終了なので無視
      if (
        reason &&
        typeof reason === "object" &&
        "name" in reason &&
        reason.name === "ExitPromptError"
      ) {
        this.cleanupAndExit(0);
        return;
      }
      console.error(
        colors.red("🚨 Unhandled Rejection at:"),
        promise,
        colors.red("reason:"),
        reason,
      );
      this.cleanupAndExit(1);
    };

    const uncaughtExceptionHandler = (error: Error) => {
      // ExitPromptErrorは正常な終了なので無視
      if (error.name === "ExitPromptError") {
        this.cleanupAndExit(0);
        return;
      }
      console.error(colors.red("🚨 Uncaught Exception:"), error);
      this.cleanupAndExit(1);
    };

    const sigintHandler = () => {
      this.cleanupTerminal();
      console.log("\n👋 CLIを終了します...");
      this.cleanupAndExit(0);
    };

    // イベントハンドラーを登録
    process.on("unhandledRejection", unhandledRejectionHandler);
    process.on("uncaughtException", uncaughtExceptionHandler);
    process.on("SIGINT", sigintHandler);

    this.userSession = null;

    try {
      // メインメニュー
      while (true) {
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
            colors.green(`✅ ログイン成功: ${this.userSession.username}`),
          );
        }
        console.log();

        // ターミナル状態を確実に初期化してからメニュー表示
        this.initializeTerminalForMenu();
        const action = await this.showMainMenu();
        switch (action) {
          case "random":
            await this.joinRandomGame();
            return;
          case "exit":
            await this.cleanup();
            return;
        }
      }
    } catch (error) {
      console.error(colors.red("🚨 エラーが発生しました:"), error);
      await this.cleanup();
      process.exit(1);
    } finally {
      // イベントハンドラーを削除
      process.removeListener("unhandledRejection", unhandledRejectionHandler);
      process.removeListener("uncaughtException", uncaughtExceptionHandler);
      process.removeListener("SIGINT", sigintHandler);
    }
  }

  // ヘルパーメソッドを追加
  private cleanupTerminal(): void {
    try {
      // ターミナル状態をリセット
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdout.write("\x1b[?25h"); // カーソル表示
      process.stdout.write("\x1b[?1049l"); // 通常スクリーンバッファ
    } catch (error) {
      console.error("Error during terminal cleanup:", error);
    }
  }

  private async cleanupAndExit(code: number): Promise<void> {
    this.cleanupTerminal();
    try {
      await this.cleanup();
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
    process.exit(code);
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
   * メニュー表示前の初期化
   */
  private initializeTerminalForMenu(): void {
    try {
      // TTYの設定を明示的にリセット
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
        process.stdin.resume();
      }

      // 通常のラインモードに戻す
      process.stdout.write("\x1b[?1l\x1b>");
    } catch (error) {
      console.error("Failed to initialize terminal for menu:", error);
    }
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
    exit(0); // ゲーム終了後にCLIを終了
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
            // タイマーは使用せず、ユーザー入力を待つ
          },
          onWaitingForPlayer: () => {
            this.gameUI?.onWaitingForPlayer();
          },
          onError: (error) => {
            this.gameUI?.showError(error);
            this.clearGameEndTimer();
            // タイマーは使用せず、ユーザー入力を待つ
          },
          onDisconnected: () => {
            this.clearGameEndTimer();
            this.gameUI?.showDisconnected();
            // タイマーは使用せず、ユーザー入力を待つ
          },
        }, this.authClient.getCookieJar());

        // UI イベントハンドラーを設定
        this.gameUI.onPaddleMove = (y) => {
          this.gameClient?.movePaddle(y);
        };

        this.gameUI.onQuit = () => {
          this.clearGameEndTimer();
          this.endGame();
          resolve(); // 手動終了時もPromiseを解決
        };

        this.gameUI.onReturnToMenu = () => {
          this.clearGameEndTimer();
          this.endGame();
          resolve(); // メニューに戻る時もPromiseを解決
        };

        this.gameUI.onGameSettings = (ballSpeed, winningScore) => {
          this.gameClient?.sendGameSettings(ballSpeed, winningScore);
        };

        // WebSocket 接続（非同期）
        this.gameClient!
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
          (error as Error).message,
        );

        // エラーメッセージを表示してユーザー入力を待つ
        this.clearGameEndTimer();
        reject(error);
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

    console.log(colors.cyan("🏓 ご利用ありがとうございました"));

    // ライブラリ間の切り替えのため少し待機
    setTimeout(() => {}, 100);
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
      // 残留イベントリスナーをクリア
      process.stdin.removeAllListeners("keypress");
      process.stdin.removeAllListeners("data");
    } catch (error) {
      console.error("Failed to remove listeners:", error);
    }

    try {
      // カーソルを表示
      process.stdout.write("\x1b[?25h");
    } catch (error) {
      console.error("Failed to show cursor:", error);
    }

    try {
      // 通常のスクリーンバッファに戻る
      process.stdout.write("\x1b[?1049l");
    } catch (error) {
      console.error("Failed to restore screen buffer:", error);
    }

    try {
      // カーソルキーモードを通常に戻す
      process.stdout.write("\x1b[?1l");
    } catch (error) {
      console.error("Failed to reset cursor key mode:", error);
    }

    try {
      // キーパッドモードを無効化
      process.stdout.write("\x1b>");
    } catch (error) {
      console.error("Failed to reset keypad mode:", error);
    }

    try {
      // 画面をクリア
      console.clear();
    } catch (error) {
      console.error("Failed to clear screen:", error);
    }

    try {
      // stdin を再開して通常のライン入力モードに戻す
      if (process.stdin.isTTY) {
        process.stdin.resume();
      }
    } catch (error) {
      console.error("Failed to resume stdin:", error);
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
    exit(0);
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

// メイン関数を実行
if (require.main === module) {
  console.clear();
  main().catch((error) => {
    console.error(colors.red("🚨 Fatal error:"), error);
    process.exit(1);
  });
}

export { PongCLI };
