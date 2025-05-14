import type { FastifyInstance } from "fastify";
import usersRoutes from "./users";

export default async function routes(fastify: FastifyInstance) {
  fastify.register(usersRoutes, { prefix: "/api/users" });
}
