import type { FastifyInstance } from "fastify";
import usersRoutes from "./user/user";

import gameIdRoute from "./game/socket";

export default async function routes(fastify: FastifyInstance) {
  fastify.register(usersRoutes, { prefix: "/user" });
  fastify.register(gameIdRoute, { prefix: "/game" });
}
