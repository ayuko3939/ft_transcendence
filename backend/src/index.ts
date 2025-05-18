import Fastify from "fastify";
import cors from "@fastify/cors";
import type { WebSocket } from "@fastify/websocket";
import { GameEngine } from "./game/GameState";
import { GameState, GameRoom } from "./types";
import { mkdirSync } from "node:fs";
import websocket from "@fastify/websocket";
import dotenv from "dotenv";
import routes from "./routes";

dotenv.config();

// ログファイルのディレクトリを作成
mkdirSync("logs", { recursive: true });

const fastify = Fastify({
  logger: {
    level: "debug",
    file: "logs/server.log",
  },
});

// 非同期処理を関数にまとめる
const startServer = async () => {
  await fastify.register(cors, {
    origin: [process.env.FRONTEND_URL ?? "http://localhost:3000"],
  });

  await fastify.register(websocket);

  // APIルートを登録
  await fastify.register(routes);

  const gameRooms = new Map<string, GameRoom>();

  fastify.get("/game", { websocket: true }, (connection, req) => {
    // ルームの作成または参加
    let roomId = "1"; // シンプルのため固定
    let room = gameRooms.get(roomId);

    if (!room) {
      const WINNING_SCORE = 10; // 勝利点数を設定 // UIで設定できるようにする

      room = {
        players: {},
        gameState: {
          ball: {
            x: 400,
            y: 300,
            dx: 5,
            dy: 5,
            radius: 10,
          },
          paddleLeft: {
            x: 50,
            y: 250,
            width: 10,
            height: 100,
          },
          paddleRight: {
            x: 740,
            y: 250,
            width: 10,
            height: 100,
          },
          score: { left: 0, right: 0 },
          gameOver: false,
          winner: null,
          winningScore: WINNING_SCORE,
        },
        chats: [],
        gameStarted: false,
      };
      gameRooms.set(roomId, room);
    }

    // プレイヤーの割り当て
    let playerSide: "left" | "right";
    if (!room.players.left) {
      room.players.left = connection;
      playerSide = "left";
      console.log("left player connected");
    } else if (!room.players.right) {
      room.players.right = connection;
      playerSide = "right";
      console.log("right player connected");

      // 2人目のプレイヤーが参加したら、カウントダウンを開始
      let countdown = 5;
      const countdownInterval = setInterval(() => {
        if (room && room.players.left && room.players.right) {
          // カウントダウンメッセージを送信
          const countdownMessage = JSON.stringify({
            type: "countdown",
            count: countdown,
          });

          room.players.left.send(countdownMessage);
          room.players.right.send(countdownMessage);

          countdown--;

          if (countdown < 0) {
            clearInterval(countdownInterval);
            room.gameStarted = true;

            // ゲーム開始メッセージを送信
            const gameStartMessage = JSON.stringify({
              type: "gameStart",
              gameState: room.gameState,
            });

            room.players.left.send(gameStartMessage);
            room.players.right.send(gameStartMessage);

            // ゲームループの開始
            const gameEngine = new GameEngine(room.gameState);
            const gameInterval = setInterval(() => {
              if (room.gameStarted && room.players.left && room.players.right) {
                gameEngine.update();

                // 両プレイヤーに状態を送信
                const stateMessage = JSON.stringify({
                  type: "gameState",
                  ...room.gameState,
                });

                room.players.left.send(stateMessage);
                room.players.right.send(stateMessage);

                // ゲームが終了した場合
                if (room.gameState.gameOver) {
                  // ゲーム終了メッセージを送信
                  const gameOverMessage = JSON.stringify({
                    type: "gameOver",
                    winner: room.gameState.winner,
                    leftScore: room.gameState.score.left,
                    rightScore: room.gameState.score.right,
                  });

                  room.players.left.send(gameOverMessage);
                  room.players.right.send(gameOverMessage);

                  // ゲームループを停止
                  clearInterval(gameInterval);
                }
              } else {
                clearInterval(gameInterval);
              }
            }, 1000 / 60); // 60FPS
          }
        } else {
          clearInterval(countdownInterval);
        }
      }, 1000);
    } else {
      connection.close();
      return;
    }

    // メッセージの処理
    connection.on("message", (message: Buffer) => {
      const data = JSON.parse(message.toString());

      if (data.type === "chat") {
        room!.chats.push({
          name: data.name,
          message: data.message,
        });

        // 他のプレイヤーにメッセージを送信
        const opponent =
          playerSide === "left" ? room!.players.right : room!.players.left;

        connection.send(JSON.stringify(room!.chats));
        if (opponent) {
          opponent.send(JSON.stringify(room!.chats));
        }
      }
      if (data.type === "paddleMove") {
        if (playerSide === "left") {
          room!.gameState.paddleLeft.y = data.y;
        } else {
          room!.gameState.paddleRight.y = data.y;
        }

        // 他のプレイヤーに状態を送信
        const opponent =
          playerSide === "left" ? room!.players.right : room!.players.left;
        if (opponent) {
          opponent.send(JSON.stringify(room!.gameState));
        }
      }
    });

    // 切断時の処理
    connection.on("close", () => {
      if (room!.players[playerSide] === connection) {
        room!.players[playerSide] = undefined;
      }

      // ルームが空になったら削除
      if (!room!.players.left && !room!.players.right) {
        gameRooms.delete(roomId);
      }
    });

    // 初期状態を送信
    connection.send(
      JSON.stringify({
        type: "init",
        side: playerSide,
        gameState: room.gameState,
      }),
    );
  });

  // Declare a route
  fastify.get("/", (request, reply) => {
    reply.send({ hello: "world" });
  });

  try {
    const port = Number(process.env.PORT) || 3001;
    await fastify.listen({ port: port, host: "0.0.0.0" });
    console.log(`Server running at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

startServer();
