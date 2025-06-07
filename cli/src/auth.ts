import axios, { AxiosInstance } from "axios";
import { CookieJar } from "tough-cookie";
import axiosCookieJarSupport from "axios-cookiejar-support";
import type { AuthCredentials, UserSession, CLIConfig } from "./types";

export class AuthClient {
  private config: CLIConfig;
  private cookieJar: CookieJar;
  private axios: AxiosInstance;

  constructor(config: CLIConfig) {
    this.config = config;
    this.cookieJar = new CookieJar();

    // axiosにクッキーサポートを追加
    this.axios = axiosCookieJarSupport.wrapper(axios.create());
    (this.axios.defaults as any).jar = this.cookieJar;
    this.axios.defaults.withCredentials = true;
  }

  /**
   * メールアドレスとパスワードでログイン
   */
  async login(credentials: AuthCredentials): Promise<UserSession> {
    try {
      const response = await this.axios.post(
        `${this.config.authUrl}/login`,
        {
          username: credentials.email,
          password: credentials.password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (
        response.status === 200 &&
        response.data.user &&
        response.data.sessionToken
      ) {
        const user = response.data.user;
        const sessionToken = response.data.sessionToken;

        // NextAuthのセッショントークンをクッキーとして設定
        await this.cookieJar.setCookie(
          `next-auth.session-token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax`,
          this.config.authUrl,
        );

        // デバッグ: クッキーが正しく設定されたか確認
        console.log(
          `🍪 クッキー設定完了: next-auth.session-token=${sessionToken.substring(0, 8)}...`,
        );
        const cookies = this.cookieJar.getCookiesSync(this.config.authUrl);
        console.log(`🍪 保存されたクッキー数: ${cookies.length}`);

        return {
          sessionToken: sessionToken,
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
          `認証エラー: ${error.response?.data?.error || error.message}`,
        );
      }
      throw new Error(`ネットワークエラー: ${error}`);
    }
  }

  /**
   * セッションの有効性を確認
   */
  async validateSession(sessionToken?: string): Promise<boolean> {
    try {
      // セッショントークンが明示的に渡された場合はクッキーとして設定
      if (sessionToken) {
        await this.cookieJar.setCookie(
          `next-auth.session-token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax`,
          this.config.authUrl,
        );
      }

      const response = await this.axios.get(`${this.config.authUrl}/check`);
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * 保存されたクッキーを取得
   */
  getCookies(): string {
    const cookies = this.cookieJar.getCookiesSync(this.config.authUrl);
    return cookies.map((cookie) => cookie.toString()).join("; ");
  }

  /**
   * クッキージャーを取得（ゲームクライアント等で使用）
   */
  getCookieJar(): CookieJar {
    return this.cookieJar;
  }
}
