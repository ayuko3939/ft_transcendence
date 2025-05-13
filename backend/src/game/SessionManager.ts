import type { WebSocket } from "@fastify/websocket";
import type { SessionInfo, WebSocketResponse } from "./types/session";
import { Session } from "./Session";

/**
 * ゲームセッションマネージャー
 * 全てのアクティブなゲームセッションを管理する
 */
export class SessionManager {
  private sessions: Map<string, Session> = new Map();

  /**
   * 新しいセッションを作成
   */
  public createSession(
    sessionName: string,
    creatorId: string,
    creatorName: string,
    creatorSocket: WebSocket,
  ): Session {
    const session = new Session(
      sessionName,
      creatorId,
      creatorName,
      creatorSocket,
    );
    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * セッションを取得
   */
  public getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 全てのセッション情報を取得
   */
  public getAllSessions(): SessionInfo[] {
    return Array.from(this.sessions.values()).map((session) =>
      session.getSessionInfo(),
    );
  }

  /**
   * セッションを削除
   */
  public removeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.dispose();
      return this.sessions.delete(sessionId);
    }
    return false;
  }

  /**
   * プレイヤーがセッションから退出した時に呼び出される
   */
  public playerLeft(playerId: string): void {
    for (const session of this.sessions.values()) {
      session.removePlayer(playerId);
    }
    this.cleanupEmptySessions();
  }

  /**
   * 空のセッションをクリーンアップ
   */
  private cleanupEmptySessions(): void {
    for (const [id, session] of this.sessions.entries()) {
      if (session.players.length === 0) {
        this.removeSession(id);
      }
    }
  }

  /**
   * 全てのセッションに通知を送信
   */
  public broadcastToAll(message: WebSocketResponse): void {
    for (const session of this.sessions.values()) {
      for (const player of session.players) {
        try {
          player.socket.send(JSON.stringify(message));
        } catch (error) {
          console.error(`Failed to broadcast to player ${player.id}:`, error);
        }
      }
    }
  }
}

// シングルトンとしてエクスポート
export const sessionManager = new SessionManager();
