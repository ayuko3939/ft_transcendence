import type { GameRoom } from "../../types/game";
import type { PlayerSide } from "../../types/shared/types";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { WebSocket } from "@fastify/websocket";

import { GameHandlerService } from "./GameHandlerService";
import {
  checkAndStartGame,
  findAvailableRoom,
  createGameRoom,
} from "./roomUtils";

export const gameRooms = new Map<string, GameRoom>();

/**
 * WebSocket接続時のハンドラ関数 - 適切なルームを自動的に見つける
 */
export function handleGameConnection(
  connection: WebSocket,
  req: FastifyRequest,
  fastify: FastifyInstance
) {
  const { roomId, room } = findAvailableRoom(gameRooms);
  assignPlayerToRoom(connection, req, fastify, room, roomId);
}

/**
 * 指定されたIDのゲームルームへのWebSocket接続リクエストを処理します。
 *
 * この関数は以下を行います：
 * 1. リクエストパラメータからルームIDを検証
 * 2. 指定されたIDのゲームルームを検索または作成
 * 3. ルームが満室かどうか確認（既に2人のプレイヤーが接続済み）
 * 4. 空きがある場合、接続プレイヤーをルームに割り当て
 *
 * @param connection - クライアントからのWebSocket接続インスタンス
 * @param req - URLパラメータを含むFastifyリクエストオブジェクト
 * @param fastify - サーバー全体のリソースにアクセスするためのFastifyインスタンス
 *
 * @remarks
 * 以下の場合、適切なステータスコードで接続を閉じます：
 * - ルームIDが無効（コード1003）
 * - ルームが既に満室（コード1008）
 */
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

/**
 * プレイヤーをルームに割り当てる共通関数
 */
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
    console.log(`Room ${roomId}: left player connected`);
  } else if (!room.players.right) {
    room.players.right = connection;
    playerSide = "right";
    console.log(`Room ${roomId}: right player connected`);
    checkAndStartGame(room);
  } else {
    // このケースは handleGameConnectionWithRoomId で既にチェックされているはずだが念のため
    connection.close(1008, "Room is full");
    return;
  }
  const gameHandlerService = new GameHandlerService(room);

  // メッセージ処理のイベントリスナーを設定
  connection.on("message", (message: Buffer) => {
    gameHandlerService.handlePlayerMessage(message, playerSide);
  });

  // 切断処理のイベントリスナーを設定
  connection.on("close", () => {
    gameHandlerService.handlePlayerDisconnect(playerSide, roomId, gameRooms);
  });

  // 初期状態を送信
  connection.send(
    JSON.stringify({
      type: "init",
      side: playerSide,
      state: room.state,
      roomId: roomId, // ルームIDも送信
    })
  );
}
