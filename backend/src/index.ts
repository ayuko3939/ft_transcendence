import Fastify from "fastify";
import cors from "@fastify/cors";
import { mkdirSync } from "node:fs";
import websocket from "@fastify/websocket";
import dotenv from "dotenv";
import routes from "./routes";
import { handleWebSocket } from "./game/WebSocketHandler";

dotenv.config();

mkdirSync("logs", { recursive: true });

const fastify = Fastify({
  logger: {
    level: "debug",
    file: "logs/server.log",
  },
});

const startServer = async () => {
  await fastify.register(cors, {
    origin: [process.env.FRONTEND_URL ?? "http://localhost:3000"],
  });

  await fastify.register(websocket);
  await fastify.register(routes);

  fastify.get("/game", { websocket: true }, handleWebSocket);

  fastify.get("/", (request, reply) => {
    reply.send({ status: "ok", message: "Pong Game Server is running" });
  });

  try {
    const port = Number(process.env.PORT) || 3001;
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`Server running at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

startServer();
