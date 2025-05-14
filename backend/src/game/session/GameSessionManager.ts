import type { WebSocket } from "@fastify/websocket";
import { GameSession } from "./GameSession";
import crypto from "crypto";

/**
 * ゲームセッション管理クラス
 * アプリケーション全体のゲームセッションを管理する
 */
export class GameSessionManager {
  private sessions: Map<string, GameSession> = new Map();
  
  constructor() {}
  
  /**
   * 新しいゲームセッションを作成する
   * @param name ゲーム名
   * @param creatorId 作成者のユーザーID
   * @param creatorName 作成者のユーザー名
   * @returns 作成されたゲームセッションのID
   */
  public createSession(name: string, creatorId: string, creatorName: string): string {
    // ランダムなIDを生成
    const id = crypto.randomUUID();
    
    // ゲームセッションを作成
    const session = new GameSession(id, name, creatorId, creatorName);
    this.sessions.set(id, session);
    
    return id;
  }
  
  /**
   * ゲームセッションを取得する
   * @param id ゲームセッションID
   * @returns ゲームセッション、存在しない場合はnull
   */
  public getSession(id: string): GameSession | null {
    return this.sessions.get(id) || null;
  }
  
  /**
   * すべてのアクティブなゲームセッション情報を取得する
   * @returns ゲームセッション情報の配列
   */
  public getAllSessions(): Array<{
    id: string;
    name: string;
    status: string;
    players: {
      left: { userId: string; username: string } | null;
      right: { userId: string; username: string } | null;
    };
    spectatorCount: number;
    createdAt: Date;
    score: { left: number; right: number };
  }> {
    const sessions: any[] = [];
    
    this.sessions.forEach(session => {
      sessions.push(session.getInfo());
    });
    
    return sessions;
  }
  
  /**
   * プレイヤーをゲームセッションに追加する
   * @param sessionId ゲームセッションID
   * @param userId ユーザーID
   * @param username ユーザー名
   * @param socket WebSocketコネクション
   * @returns プレイヤーの役割 ("left" | "right" | "spectator" | null)
   */
  public addPlayerToSession(sessionId: string, userId: string, username: string, socket: WebSocket): "left" | "right" | "spectator" | null {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }
    
    // プレイヤーとして追加を試みる
    const playerSide = session.addPlayer(userId, username, socket);
    if (playerSide) {
      return playerSide;
    }
    
    // プレイヤーとして追加できなかった場合は観戦者として追加
    session.addSpectator(userId, username, socket);
    return "spectator";
  }
  
  /**
   * ゲームセッションを削除する
   * @param id ゲームセッションID
   */
  public removeSession(id: string): void {
    const session = this.getSession(id);
    if (session) {
      session.destroy();
      this.sessions.delete(id);
    }
  }
  
  /**
   * 終了したゲームセッションをクリーンアップする
   * 定期的に実行するとよい
   */
  public cleanupFinishedSessions(): void {
    const now = new Date();
    
    this.sessions.forEach((session, id) => {
      // ゲーム終了から30分経過したセッションを削除
      if (
        (session.status === "finished" || session.status === "abandoned") &&
        ((now.getTime() - session.createdAt.getTime()) > 30 * 60 * 1000)
      ) {
        this.removeSession(id);
      }
    });
  }
}

// シングルトンインスタンスをエクスポート
export const gameSessionManager = new GameSessionManager();
