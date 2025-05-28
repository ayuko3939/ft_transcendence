import type { GameRoom } from "../../types/game";
import type { PlayerSide } from "@ft-transcendence/shared";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { WebSocket } from "@fastify/websocket";

import { GameHandlerService } from "./GameHandlerService";
import {
  checkAndStartGame,
  findAvailableRoom,
  createGameRoom,
} from "./roomUtils";

export const gameRooms = new Map<string, GameRoom>();

export function handleGameConnection(
  connection: WebSocket,
  req: FastifyRequest,
  fastify: FastifyInstance
) {
  const { roomId, room } = findAvailableRoom(gameRooms);
  assignPlayerToRoom(connection, req, fastify, room, roomId);
}

export function handleGameConnectionWithRoomId(
  connection: WebSocket,
  req: FastifyRequest,
  fastify: FastifyInstance
) {
  const { roomId } = req.params as { roomId: string };
  if (!roomId) {
    connection.close(1003, "Invalid room ID");
    return;
  }
  let room = gameRooms.get(roomId);
  if (!room) {
    room = createGameRoom();
    gameRooms.set(roomId, room);
  }
  if (room.players.left && room.players.right) {
    connection.close(1008, "Room is full");
    return;
  }
  assignPlayerToRoom(connection, req, fastify, room, roomId);
}

function assignPlayerToRoom(
  connection: WebSocket,
  req: FastifyRequest,
  fastify: FastifyInstance,
  room: GameRoom,
  roomId: string
) {
  let playerSide: PlayerSide;

  if (!room.players.left) {
    room.players.left = connection;
    playerSide = "left";
  } else if (!room.players.right) {
    room.players.right = connection;
    playerSide = "right";
  } else {
    connection.close(1008, "Room is full");
    return;
  }

  const gameHandlerService = new GameHandlerService(room);

  connection.on("message", (message: Buffer) => {
    gameHandlerService.handlePlayerMessage(message, playerSide);
  });

  connection.on("close", () => {
    gameHandlerService.handlePlayerDisconnect(playerSide, roomId, gameRooms);
  });

  // 認証を待つため、ここではinitメッセージを送信しない
  // 認証完了後にGameHandlerService.handleAuthMessage()で送信される
  console.log(
    `プレイヤー ${playerSide} がルーム ${roomId} に接続しました（認証待ち）`
  );
}
