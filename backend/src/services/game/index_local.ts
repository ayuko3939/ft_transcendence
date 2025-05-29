import type { GameRoom } from "../../types/game";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { WebSocket } from "@fastify/websocket";

import { GameHandlerService } from "./GameHandlerService";
import { createGameRoom } from "./roomUtils";

// ローカル対戦専用のゲームルーム管理
export const localGameRooms = new Map<string, GameRoom>();

export function handleLocalGameConnection(
  connection: WebSocket,
  req: FastifyRequest,
  fastify: FastifyInstance,
) {
  // ローカル対戦用の新しいルームを作成
  const roomId = crypto.randomUUID();
  const room = createGameRoom("local");
  localGameRooms.set(roomId, room);

  // ローカル対戦では1つのクライアントが両方のプレイヤーを制御
  assignLocalPlayerToRoom(connection, req, fastify, room, roomId);
}

function assignLocalPlayerToRoom(
  connection: WebSocket,
  req: FastifyRequest,
  fastify: FastifyInstance,
  room: GameRoom,
  roomId: string,
) {
  // ローカル対戦では1つのクライアントが両方のプレイヤーを制御
  room.players.left = connection;
  room.players.right = connection;

  const gameHandlerService = new GameHandlerService(room);

  connection.on("message", (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString());
      
      // paddleMoveメッセージの場合、playerSideを判定
      if (data.type === "paddleMove" && data.playerSide) {
        gameHandlerService.handlePlayerMessage(message, data.playerSide);
      } else {
        // その他のメッセージは左プレイヤーとして処理
        gameHandlerService.handlePlayerMessage(message, "left");
      }
    } catch (error) {
      console.error("ローカルゲームメッセージ処理エラー:", error);
    }
  });

  connection.on("close", () => {
    // ローカル対戦では接続が切れたらルーム全体を削除
    gameHandlerService.handlePlayerDisconnect("left", roomId, localGameRooms);
  });

  console.log(`ローカルゲームルーム ${roomId} が作成されました（認証待ち）`);
}
