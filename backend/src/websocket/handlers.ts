import type { FastifyInstance } from "fastify";
import type { WebSocket } from "@fastify/websocket";
import { gameSessionManager } from "../game/session/GameSessionManager";

/**
 * WebSocketの接続と通信を処理する
 * @param fastify Fastifyインスタンス
 */
export default function setupWebSocketHandlers(fastify: FastifyInstance): void {
  // ゲームセッションのWebSocketエンドポイント
  fastify.get("/game/:sessionId", { websocket: true }, (connection, req) => {
    const { sessionId } = req.params as { sessionId: string };
    const queryParams = req.query as { userId?: string; username?: string; action?: string };
    
    // ユーザー情報の検証
    if (!queryParams.userId || !queryParams.username) {
      connection.send(JSON.stringify({
        type: "error",
        message: "ユーザー情報が必要です"
      }));
      connection.close();
      return;
    }
    
    const { userId, username, action } = queryParams;
    
    // セッションに参加
    handleSessionJoin(sessionId, userId, username, action || "join", connection);
  });
  
  // ゲームセッションリスト更新のためのWebSocketエンドポイント
  fastify.get("/game-list", { websocket: true }, (connection, req) => {
    handleGameListSubscription(connection);
  });
}

/**
 * ゲームセッションへの参加を処理する
 */
function handleSessionJoin(sessionId: string, userId: string, username: string, action: string, socket: WebSocket): void {
  // セッションの存在確認
  const session = gameSessionManager.getSession(sessionId);
  
  if (!session) {
    // セッションが存在しない場合
    socket.send(JSON.stringify({
      type: "error",
      message: "ゲームセッションが見つかりません"
    }));
    socket.close();
    return;
  }
  
  // アクション（join, spectate）に応じた処理
  if (action === "spectate") {
    // 観戦者として参加
    session.addSpectator(userId, username, socket);
    
    // 観戦者数の更新を他のユーザーに通知するなどの処理
  } else {
    // プレイヤーとして参加
    const role = gameSessionManager.addPlayerToSession(sessionId, userId, username, socket);
    
    if (!role) {
      socket.send(JSON.stringify({
        type: "error",
        message: "ゲームセッションに参加できません"
      }));
      socket.close();
    }
  }
  
  // 他のクライアントにゲームリストの更新を通知
  broadcastGameListUpdate();
}

// ゲームリスト購読クライアント
const gameListSubscribers: WebSocket[] = [];

/**
 * ゲームリスト購読を処理する
 */
function handleGameListSubscription(socket: WebSocket): void {
  // 購読者リストに追加
  gameListSubscribers.push(socket);
  
  // 初期リストを送信
  sendGameList(socket);
  
  // 切断時の処理
  socket.on("close", () => {
    const index = gameListSubscribers.indexOf(socket);
    if (index !== -1) {
      gameListSubscribers.splice(index, 1);
    }
  });
}

/**
 * ゲームリストを特定のクライアントに送信する
 */
function sendGameList(socket: WebSocket): void {
  const sessions = gameSessionManager.getAllSessions();
  
  socket.send(JSON.stringify({
    type: "gameList",
    sessions
  }));
}

/**
 * ゲームリストの更新を全ての購読クライアントに通知する
 */
export function broadcastGameListUpdate(): void {
  // 不要な接続を削除
  for (let i = gameListSubscribers.length - 1; i >= 0; i--) {
    if (gameListSubscribers[i].readyState !== WebSocket.OPEN) {
      gameListSubscribers.splice(i, 1);
    }
  }

  const sessions = gameSessionManager.getAllSessions();
  const message = JSON.stringify({
    type: "gameList",
    sessions
  });
  
  for (const socket of gameListSubscribers) {
    socket.send(message);
  }
}

export function setupSessionCleanup(): void {
  // 10分ごとに終了したセッションをクリーンアップ
  setInterval(() => {
    gameSessionManager.cleanupFinishedSessions();
    // クリーンアップ後にゲームリスト更新を通知
    broadcastGameListUpdate();
  }, 10 * 60 * 1000);
}
