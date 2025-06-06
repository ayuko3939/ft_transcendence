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
  fastify: FastifyInstance,
) {
  const { roomId, room } = findAvailableRoom(gameRooms);
  assignPlayerToRoom(connection, req, fastify, room, roomId);
}

export function handleGameConnectionWithRoomId(
  connection: WebSocket,
  req: FastifyRequest,
  fastify: FastifyInstance,
) {
  const { roomId } = req.params as { roomId: string };
  if (!roomId) {
    connection.close(1003, "Invalid room ID");
    return;
  }
  let room = gameRooms.get(roomId);
  if (!room) {
    room = createGameRoom("online");
    gameRooms.set(roomId, room);
  }
  if (room.players.left && room.players.right) {
    connection.close(1008, "Room is full");
    return;
  }
  assignPlayerToRoom(connection, req, fastify, room, roomId);
}

// トーナメント試合用のWebSocket接続ハンドラ
export async function handleTournamentMatchConnection(
  connection: WebSocket,
  req: FastifyRequest,
  fastify: FastifyInstance,
) {
  const { matchId } = req.params as { matchId: string };
  console.log(`[Tournament] WebSocket接続要求: matchId=${matchId}`);
  if (!matchId) {
    connection.close(1003, "Invalid tournament match ID");
    return;
  }

  // トーナメントサービスを使ってマッチ情報を取得
  const { TournamentService } = await import("../tournament/TournamentService");
  const tournamentService = new TournamentService();
  const matchDetails = await tournamentService.getMatchDetails(matchId);

  if (!matchDetails) {
    connection.close(1003, "Tournament match not found");
    return;
  }

  // ゲームルームIDとしてトーナメントマッチIDを使用
  let room = gameRooms.get(matchId);
  if (!room) {
    room = createGameRoom("tournament");
    room.tournamentId = matchDetails.tournamentId;
    room.tournamentMatchId = matchId;
    // トーナメントでは設定済みですぐ開始
    room.leftPlayerReady = true;
    gameRooms.set(matchId, room);
  }

  if (room.players.left && room.players.right) {
    connection.close(1008, "Tournament match room is full");
    return;
  }
  assignPlayerToRoom(connection, req, fastify, room, matchId);
}

function assignPlayerToRoom(
  connection: WebSocket,
  req: FastifyRequest,
  fastify: FastifyInstance,
  room: GameRoom,
  roomId: string,
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

  // トーナメントマッチの場合、最初のメッセージでプレイヤー認証を待つ
  let isAuthenticated = room.state.gameType !== "tournament";

  connection.on("message", (message: Buffer) => {
    gameHandlerService.handlePlayerMessage(message, playerSide);

    // トーナメントの場合、authメッセージ後に認証フラグを立てる
    if (!isAuthenticated) {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "auth") {
          isAuthenticated = true;
        }
      } catch {
        // パースエラーは無視
      }
    }
  });

  connection.on("close", () => {
    gameHandlerService.handlePlayerDisconnect(playerSide, roomId, gameRooms);
  });

  console.log(`プレイヤー ${playerSide} がルーム ${roomId} に接続しました`);
}
