import type { FastifyInstance } from "fastify";
import { gameSessionManager } from "../game/session/GameSessionManager";
import { broadcastGameListUpdate } from "../websocket/handlers";

export default async function gameRoutes(fastify: FastifyInstance) {
  /**
   * ゲームセッション一覧を取得するエンドポイント
   */
  fastify.get("/sessions", async (request, reply) => {
    try {
      const sessions = gameSessionManager.getAllSessions();
      return { sessions };
    } catch (error) {
      fastify.log.error(`ゲームセッション一覧取得エラー: ${error}`);
      return reply
        .status(500)
        .send({ error: "ゲームセッション一覧の取得中にエラーが発生しました" });
    }
  });

  /**
   * 新しいゲームセッションを作成するエンドポイント
   */
  fastify.post("/sessions", async (request, reply) => {
    try {
      const { name, userId, username } = request.body as { name: string; userId: string; username: string };
      
      if (!name || !userId || !username) {
        return reply.status(400).send({ 
          error: "ゲーム名、ユーザーID、ユーザー名は必須です" 
        });
      }
      
      const sessionId = gameSessionManager.createSession(name, userId, username);
      
      // ゲームリストの更新をブロードキャスト
      broadcastGameListUpdate();
      
      return { 
        sessionId,
        message: "ゲームセッションが作成されました"
      };
    } catch (error) {
      fastify.log.error(`ゲームセッション作成エラー: ${error}`);
      return reply
        .status(500)
        .send({ error: "ゲームセッション作成中にエラーが発生しました" });
    }
  });

  /**
   * 特定のゲームセッション情報を取得するエンドポイント
   */
  fastify.get("/sessions/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const session = gameSessionManager.getSession(id);
      
      if (!session) {
        return reply.status(404).send({ error: "ゲームセッションが見つかりません" });
      }
      
      return { session: session.getInfo() };
    } catch (error) {
      fastify.log.error(`ゲームセッション取得エラー: ${error}`);
      return reply
        .status(500)
        .send({ error: "ゲームセッション取得中にエラーが発生しました" });
    }
  });

  /**
   * ゲームセッションを削除するエンドポイント
   */
  fastify.delete("/sessions/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const session = gameSessionManager.getSession(id);
      
      if (!session) {
        return reply.status(404).send({ error: "ゲームセッションが見つかりません" });
      }
      
      gameSessionManager.removeSession(id);
      
      // ゲームリストの更新をブロードキャスト
      broadcastGameListUpdate();
      
      return { message: "ゲームセッションが削除されました" };
    } catch (error) {
      fastify.log.error(`ゲームセッション削除エラー: ${error}`);
      return reply
        .status(500)
        .send({ error: "ゲームセッション削除中にエラーが発生しました" });
    }
  });
}
