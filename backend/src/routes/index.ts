import type { FastifyInstance } from "fastify";
import usersRoutes from "./user/user";
import tournamentRoutes from "./tournament/tournament";
import tournamentSocketRoute from "./tournament/socket";

import gameIdRoute from "./game/socket";

export default async function routes(fastify: FastifyInstance) {
  fastify.register(usersRoutes, { prefix: "/user" });
  fastify.register(tournamentRoutes, { prefix: "/tournament" });
  fastify.register(tournamentSocketRoute, { prefix: "/tournament" });
  fastify.register(gameIdRoute, { prefix: "/game" });
}
