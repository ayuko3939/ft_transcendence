import type { FastifyInstance } from "fastify";
import { db } from "../../db";
import { user } from "@ft-transcendence/shared";
import { eq } from "drizzle-orm";

export default async function userRoutes(fastify: FastifyInstance) {
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
