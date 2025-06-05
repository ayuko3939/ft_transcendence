import type { FastifyInstance } from "fastify";

import {
  handleGameConnection,
  handleGameConnectionWithRoomId,
  handleTournamentMatchConnection,
} from "../../services/game/index";
import { handleLocalGameConnection } from "../../services/game/index_local";

export default async function gameIdRoute(fastify: FastifyInstance) {
  fastify.get("/", { websocket: true }, (connection, req) => {
    handleGameConnection(connection, req, fastify);
  });
  fastify.get("/:roomId", { websocket: true }, (connection, req) => {
    handleGameConnectionWithRoomId(connection, req, fastify);
  });
  fastify.get("/local", { websocket: true }, (connection, req) => {
    handleLocalGameConnection(connection, req, fastify);
  });
  fastify.get(
    "/tournament-match/:matchId",
    { websocket: true },
    async (connection, req) => {
      await handleTournamentMatchConnection(connection, req, fastify);
    }
  );
}
