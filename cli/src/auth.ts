import axios from "axios";
import type { AuthCredentials, UserSession, CLIConfig } from "./types";

export class AuthClient {
  private config: CLIConfig;

  constructor(config: CLIConfig) {
    this.config = config;
  }

  /**
   * メールアドレスとパスワードでログイン
   */
  async login(credentials: AuthCredentials): Promise<UserSession> {
    try {
      const response = await axios.post(
        `${this.config.authUrl}/login`,
        {
          username: credentials.email,
          password: credentials.password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (
        response.status === 200 &&
        response.data.user &&
        response.data.sessionToken
      ) {
        const user = response.data.user;

        return {
          sessionToken: response.data.sessionToken,
          userId: user.id,
          username: user.name || user.email,
        };
      }

      throw new Error("認証に失敗しました");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error("メールアドレスまたはパスワードが正しくありません");
        }
        if (error.response?.status === 400) {
          throw new Error("メールアドレスとパスワードを入力してください");
        }
        throw new Error(
          `認証エラー: ${error.response?.data?.error || error.message}`
        );
      }
      throw new Error(`ネットワークエラー: ${error}`);
    }
  }

  /**
   * セッションの有効性を確認
   */
  async validateSession(sessionToken: string): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.authUrl}/check`, {
        headers: {
          Cookie: `authjs.session-token=${sessionToken}`,
        },
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * ログアウト（セッションの無効化）
   */
  async logout(sessionToken: string): Promise<void> {
    try {
      await axios.post(
        `${this.config.authUrl}/logout`,
        {},
        {
          headers: {
            Cookie: `authjs.session-token=${sessionToken}`,
          },
        }
      );
    } catch (error) {
      // ログアウトエラーは無視（サーバーの状態に関わらずクライアント側でセッションを削除）
      console.warn("ログアウト時にエラーが発生しましたが、処理を継続します");
    }
  }
}
