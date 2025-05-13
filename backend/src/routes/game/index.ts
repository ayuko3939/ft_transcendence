import type { FastifyInstance } from "fastify";
import { sessionManager } from "../../game/SessionManager";

export default async function gameRoutes(fastify: FastifyInstance) {
  fastify.get("/sessions", async (request, reply) => {
    try {
      const sessions = sessionManager.getAllSessions();
      return { sessions };
    } catch (error) {
      fastify.log.error(`セッション一覧取得エラー: ${error}`);
      return reply
        .status(500)
        .send({ error: "セッション情報の取得中にエラーが発生しました" });
    }
  });

  fastify.get("/sessions/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const session = sessionManager.getSession(id);

      if (!session) {
        return reply.status(404).send({ error: "セッションが見つかりません" });
      }

      return { session: session.getSessionInfo() };
    } catch (error) {
      fastify.log.error(`セッション取得エラー: ${error}`);
      return reply
        .status(500)
        .send({ error: "セッション情報の取得中にエラーが発生しました" });
    }
  });
}
