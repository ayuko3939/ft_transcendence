import type { FastifyInstance } from "fastify";

import {
  handleGameConnection,
  handleGameConnectionWithRoomId,
} from "../../services/game/index";

export default async function gameIdRoute(fastify: FastifyInstance) {
  fastify.get("/", { websocket: true }, (connection, req) => {
    handleGameConnection(connection, req, fastify);
  });
  fastify.get("/:roomId", { websocket: true }, (connection, req) => {
    handleGameConnectionWithRoomId(connection, req, fastify);
  });
}
