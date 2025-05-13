import type { FastifyInstance } from "fastify";
import { db } from "../db";
import { user } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export default async function usersRoutes(fastify: FastifyInstance) {
  fastify.get("/", async (request, reply) => {
    try {
      const users = await db.select().from(user);
      return { users };
    } catch (error) {
      fastify.log.error(`ユーザー一覧取得エラー: ${error}`);
      return reply
        .status(500)
        .send({ error: "ユーザーの取得中にエラーが発生しました" });
    }
  });

  fastify.get("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const foundUser = await db.select().from(user).where(eq(user.id, id));

      if (!foundUser) {
        return reply.status(404).send({ error: "ユーザーが見つかりません" });
      }

      return { user: foundUser };
    } catch (error) {
      fastify.log.error(
        `ユーザー取得エラー(ID: ${(request.params as { id: string }).id}): ${error}`,
      );
      return reply
        .status(500)
        .send({ error: "ユーザーの取得中にエラーが発生しました" });
    }
  });
}
