import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket, { WebSocket } from '@fastify/websocket';
import { GameEngine } from './game/GameState';

const fastify = Fastify({
  logger: true,
});

// 非同期処理を関数にまとめる
const startServer = async () => {
  await fastify.register(cors, {
    origin: true,
  });

  await fastify.register(websocket);

  type GameRoom = {
    players: {
      left?: WebSocket;
      right?: WebSocket;
    };
    gameState: {
      ball: {
        x: number;
        y: number;
        dx: number;
        dy: number;
      };
      paddleLeft: {
        y: number;
      };
      paddleRight: {
        y: number;
      };
      score: {
        left: number;
        right: number;
      };
    };
    chats: {
      name: string;
      message: string;
    }[];
    gameStarted: boolean;
  };

  const gameRooms = new Map<string, GameRoom>();

  fastify.get('/game', { websocket: true }, (connection, req) => {
    // ルームの作成または参加
    let roomId = '1'; // シンプルのため固定
    let room = gameRooms.get(roomId);

    if (!room) {
      room = {
        players: {},
        gameState: {
          ball: { x: 400, y: 300, dx: 5, dy: 5 },
          paddleLeft: { y: 250 },
          paddleRight: { y: 250 },
          score: { left: 0, right: 0 },
        },
        chats: [],
        gameStarted: false,
      };
      gameRooms.set(roomId, room);
    }

    // プレイヤーの割り当て
    let playerSide: 'left' | 'right';
    if (!room.players.left) {
      room.players.left = connection;
      playerSide = 'left';
      console.log('left player connected');
    } else if (!room.players.right) {
      room.players.right = connection;
      playerSide = 'right';
      console.log('right player connected');

      // 2人目のプレイヤーが参加したら、カウントダウンを開始
      let countdown = 5;
      const countdownInterval = setInterval(() => {
        if (room && room.players.left && room.players.right) {
          // カウントダウンメッセージを送信
          const countdownMessage = JSON.stringify({
            type: 'countdown',
            count: countdown
          });
          
          room.players.left.send(countdownMessage);
          room.players.right.send(countdownMessage);
          
          countdown--;
          
          if (countdown < 0) {
            clearInterval(countdownInterval);
            room.gameStarted = true;
            
            // ゲーム開始メッセージを送信
            const gameStartMessage = JSON.stringify({
              type: 'gameStart',
              gameState: room.gameState
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
                  type: 'gameState',
                  ...room.gameState
                });
                
                room.players.left.send(stateMessage);
                room.players.right.send(stateMessage);
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
    connection.on('message', (message: Buffer) => {
      const data = JSON.parse(message.toString());

      if (data.type === 'chat') {
        room!.chats.push({
          name: data.name,
          message: data.message,
        });

        // 他のプレイヤーにメッセージを送信
        const opponent =
          playerSide === 'left' ? room!.players.right : room!.players.left;

        connection.send(JSON.stringify(room!.chats));
        if (opponent) {
          opponent.send(JSON.stringify(room!.chats));
        }
      }
      if (data.type === 'paddleMove') {
        if (playerSide === 'left') {
          room!.gameState.paddleLeft.y = data.y;
        } else {
          room!.gameState.paddleRight.y = data.y;
        }

        // 他のプレイヤーに状態を送信
        const opponent =
          playerSide === 'left' ? room!.players.right : room!.players.left;
        if (opponent) {
          opponent.send(JSON.stringify(room!.gameState));
        }
      }
    });

    // 切断時の処理
    connection.on('close', () => {
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
        type: 'init',
        side: playerSide,
        gameState: room.gameState,
      })
    );
  });

  // Declare a route
  fastify.get('/', function (request, reply) {
    reply.send({ hello: 'world' });
  });

  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server running at http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// サーバーを起動
startServer();
