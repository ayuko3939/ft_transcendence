import type { FastifyInstance } from "fastify";
import usersRoutes from "./user/user";
import gameIdRoute from "./game/socket";
import tournamentRoutes from "./tournament/tournament";

export default async function routes(fastify: FastifyInstance) {
  fastify.register(usersRoutes, { prefix: "/user" });
  fastify.register(gameIdRoute, { prefix: "/game" });
  fastify.register(tournamentRoutes, { prefix: "/tournament" });
}
