import type { FastifyInstance } from "fastify";
import usersRoutes from "./users";
import gameRoutes from "./game";

export default async function routes(fastify: FastifyInstance) {
  fastify.register(usersRoutes, { prefix: "/api/users" });
  fastify.register(gameRoutes, { prefix: "/api/game" });
}
