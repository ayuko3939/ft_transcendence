import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { WebSocket } from "@fastify/websocket";
import { TournamentService, TournamentWebSocketService } from "../../services/tournament";
import { v4 as uuidv4 } from "uuid";

const tournamentService = new TournamentService();
const wsService = new TournamentWebSocketService(tournamentService);

interface CreateTournamentBody {
  name: string;
  maxPlayers?: number;
}

interface JoinTournamentParams {
  tournamentId: string;
}

interface StartTournamentParams {
  tournamentId: string;
}

interface TournamentWebSocketParams {
  tournamentId: string;
}

interface MatchWebSocketParams {
  tournamentId: string;
  matchId: string;
}

export default async function tournamentRoutes(fastify: FastifyInstance) {
  // トーナメント作成
  fastify.post<{ Body: CreateTournamentBody }>("/create", async (request, reply) => {
    try {
      const { name, maxPlayers = 8 } = request.body;
      
      // ユーザー認証が必要 - 仮にヘッダーからuserIdを取得
      const userId = request.headers["user-id"] as string;
      if (!userId) {
        return reply.status(401).send({ error: "認証が必要です" });
      }

      if (!name || name.trim().length === 0) {
        return reply.status(400).send({ error: "トーナメント名は必須です" });
      }

      if (maxPlayers < 2 || maxPlayers > 32) {
        return reply.status(400).send({ error: "参加者数は2-32名の範囲で設定してください" });
      }

      const tournamentId = await tournamentService.createTournament(name, userId, maxPlayers);
      
      return reply.status(201).send({
        success: true,
        tournamentId,
        message: "トーナメントが作成されました",
      });
    } catch (error) {
      console.error("Error creating tournament:", error);
      return reply.status(500).send({ 
        error: error instanceof Error ? error.message : "トーナメント作成中にエラーが発生しました" 
      });
    }
  });

  // トーナメント参加
  fastify.post<{ Params: JoinTournamentParams }>("/join/:tournamentId", async (request, reply) => {
    try {
      const { tournamentId } = request.params;
      const userId = request.headers["user-id"] as string;
      
      if (!userId) {
        return reply.status(401).send({ error: "認証が必要です" });
      }

      await tournamentService.joinTournament(tournamentId, userId);
      
      return reply.send({
        success: true,
        message: "トーナメントに参加しました",
      });
    } catch (error) {
      console.error("Error joining tournament:", error);
      return reply.status(400).send({ 
        error: error instanceof Error ? error.message : "トーナメント参加中にエラーが発生しました" 
      });
    }
  });

  // トーナメント退出
  fastify.post<{ Params: JoinTournamentParams }>("/leave/:tournamentId", async (request, reply) => {
    try {
      const { tournamentId } = request.params;
      const userId = request.headers["user-id"] as string;
      
      if (!userId) {
        return reply.status(401).send({ error: "認証が必要です" });
      }

      await tournamentService.leaveTournament(tournamentId, userId);
      
      return reply.send({
        success: true,
        message: "トーナメントから退出しました",
      });
    } catch (error) {
      console.error("Error leaving tournament:", error);
      return reply.status(400).send({ 
        error: error instanceof Error ? error.message : "トーナメント退出中にエラーが発生しました" 
      });
    }
  });

  // トーナメント情報取得
  fastify.get<{ Params: JoinTournamentParams }>("/info/:tournamentId", async (request, reply) => {
    try {
      const { tournamentId } = request.params;
      
      const tournament = await tournamentService.getTournament(tournamentId);
      if (!tournament) {
        return reply.status(404).send({ error: "トーナメントが見つかりません" });
      }
      
      return reply.send({
        success: true,
        tournament,
      });
    } catch (error) {
      console.error("Error getting tournament info:", error);
      return reply.status(500).send({ 
        error: "トーナメント情報取得中にエラーが発生しました" 
      });
    }
  });

  // トーナメント開始（ブラケット生成）
  fastify.post<{ Params: StartTournamentParams }>("/start/:tournamentId", async (request, reply) => {
    try {
      const { tournamentId } = request.params;
      const userId = request.headers["user-id"] as string;
      
      if (!userId) {
        return reply.status(401).send({ error: "認証が必要です" });
      }

      // トーナメント開始通知
      wsService.notifyTournamentStarting(tournamentId);

      // ブラケット生成
      const bracket = await tournamentService.startTournament(tournamentId, userId);
      
      // トーナメントの総ラウンド数を計算
      const totalRounds = Math.max(...bracket.map(m => m.round));
      
      // ブラケット生成通知
      wsService.notifyBracketGenerated(tournamentId, totalRounds);

      // 最初の試合のゲームルームを準備
      const availableMatches = tournamentService.getNextAvailableMatches(tournamentId);
      for (const match of availableMatches) {
        if (match.player1Id && match.player2Id) {
          const gameRoomId = `tournament_${tournamentId}_match_${match.id}`;
          await tournamentService.setMatchGameRoom(tournamentId, match.id, gameRoomId);
          
          // トーナメント用ゲームルームを作成
          const { createTournamentGameRoom } = require("../../services/game");
          createTournamentGameRoom(
            gameRoomId,
            tournamentId,
            match.id,
            match.player1Id,
            match.player2Id
          );
          
          // 各プレイヤーに試合開始通知
          const player1 = await tournamentService.getTournament(tournamentId);
          const player2Info = player1?.participants.find(p => p.userId === match.player2Id);
          const player1Info = player1?.participants.find(p => p.userId === match.player1Id);
          
          if (player1Info && player2Info) {
            wsService.notifyMatchReady(
              tournamentId,
              match.id,
              gameRoomId,
              match.player1Id,
              { id: player2Info.userId, name: player2Info.userName, image: player2Info.userImage }
            );
            wsService.notifyMatchReady(
              tournamentId,
              match.id,
              gameRoomId,
              match.player2Id,
              { id: player1Info.userId, name: player1Info.userName, image: player1Info.userImage }
            );
          }
        }
      }
      
      return reply.send({
        success: true,
        message: "トーナメントが開始されました",
        bracket,
        totalRounds,
      });
    } catch (error) {
      console.error("Error starting tournament:", error);
      return reply.status(400).send({ 
        error: error instanceof Error ? error.message : "トーナメント開始中にエラーが発生しました" 
      });
    }
  });

  // トーナメントルームWebSocket
  fastify.get<{ Params: TournamentWebSocketParams }>(
    "/ws/:tournamentId",
    { websocket: true },
    async (connection: WebSocket, request: FastifyRequest<{ Params: TournamentWebSocketParams }>) => {
      const { tournamentId } = request.params;
      const userId = request.headers["user-id"] as string;
      const userName = request.headers["user-name"] as string || "Unknown";
      
      if (!userId) {
        connection.close(1008, "Authentication required");
        return;
      }

      await wsService.handleConnection(connection, tournamentId, userId, userName);
    }
  );

  // トーナメント内の個別試合用WebSocket
  fastify.get<{ Params: MatchWebSocketParams }>(
    "/match/:tournamentId/:matchId",
    { websocket: true },
    async (connection: WebSocket, request: FastifyRequest<{ Params: MatchWebSocketParams }>) => {
      const { tournamentId, matchId } = request.params;
      const userId = request.headers["user-id"] as string;
      
      if (!userId) {
        connection.close(1008, "Authentication required");
        return;
      }

      try {
        // 試合情報を取得
        const tournament = await tournamentService.getTournament(tournamentId);
        if (!tournament) {
          connection.close(1003, "Tournament not found");
          return;
        }

        const match = tournament.bracket.find(m => m.id === matchId);
        if (!match) {
          connection.close(1003, "Match not found");
          return;
        }

        // プレイヤーかどうかチェック
        if (match.player1Id !== userId && match.player2Id !== userId) {
          connection.close(1008, "Not a player in this match");
          return;
        }

        // ゲームルームIDが設定されているかチェック
        if (!match.gameRoomId) {
          connection.close(1003, "Game room not ready");
          return;
        }

        console.log(`User ${userId} connecting to tournament match ${matchId} with game room ${match.gameRoomId}`);
        
        // 既存のゲームシステムを使用してゲーム接続を処理
        const { getGameRoom, hasGameRoom } = require("../../services/game");
        
        if (!hasGameRoom(match.gameRoomId)) {
          connection.close(1003, "Game room does not exist");
          return;
        }

        const gameRoom = getGameRoom(match.gameRoomId);
        if (!gameRoom) {
          connection.close(1003, "Game room not accessible");
          return;
        }

        // プレイヤーをゲームルームに割り当て
        let playerSide: "left" | "right";
        
        if (userId === match.player1Id) {
          if (gameRoom.players.left) {
            connection.close(1008, "Player 1 slot already taken");
            return;
          }
          gameRoom.players.left = connection;
          playerSide = "left";
        } else {
          if (gameRoom.players.right) {
            connection.close(1008, "Player 2 slot already taken");
            return;
          }
          gameRoom.players.right = connection;
          playerSide = "right";
        }

        console.log(`User ${userId} assigned to ${playerSide} side in tournament match ${matchId}`);

        // ゲームハンドラーを作成
        const { GameHandlerService } = require("../../services/game/GameHandlerService");
        const gameHandlerService = new GameHandlerService(gameRoom, match.gameRoomId);

        // メッセージ処理のイベントリスナーを設定
        connection.on("message", (message: Buffer) => {
          gameHandlerService.handlePlayerMessage(message, playerSide);
        });

        // 切断処理のイベントリスナーを設定
        connection.on("close", () => {
          console.log(`User ${userId} disconnected from tournament match ${matchId}`);
          gameHandlerService.handlePlayerDisconnect(playerSide, match.gameRoomId, new Map());
        });

        // 初期状態を送信
        connection.send(
          JSON.stringify({
            type: "init",
            side: playerSide,
            gameState: gameRoom.gameState,
            roomId: match.gameRoomId,
            tournamentInfo: {
              tournamentId,
              matchId,
            },
          })
        );

        // 両方のプレイヤーが接続したらゲーム開始準備
        if (gameRoom.players.left && gameRoom.players.right) {
          const { checkAndStartGame } = require("../../services/game/roomUtils");
          
          // トーナメントの試合では設定は固定で左側プレイヤーの準備完了フラグを立てる
          gameRoom.leftPlayerReady = true;
          checkAndStartGame(gameRoom, match.gameRoomId);
        }
      } catch (error) {
        console.error("Error in tournament match connection:", error);
        connection.close(1011, "Internal server error");
      }
    }
  );
}
