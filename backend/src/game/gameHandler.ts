import type { FastifyInstance } from "fastify";
import type { WebSocket } from "@fastify/websocket";
import type { FastifyRequest } from "fastify";
import { GameEngine } from "./GameState";
import { 
  GameState, 
  GameRoom, 
  ChatMessage, 
  PaddleMoveMessage, 
  SurrenderMessage, 
  GameMessage 
} from "../types";
import { GAME_CONSTANTS } from "./constants";

// ゲームルームの保持用Map
const gameRooms = new Map<string, GameRoom>();

/**
 * ゲーム関連のWebSocketハンドラを登録する関数
 * @param fastify Fastifyインスタンス
 */
export function registerGameHandler(fastify: FastifyInstance) {
  // WebSocketエンドポイントを登録
  fastify.get("/game", { websocket: true }, (connection, req) => {
    handleGameConnection(connection, req, fastify);
  });
}

/**
 * WebSocket接続時のハンドラ関数
 */
function handleGameConnection(connection: WebSocket, req: FastifyRequest, fastify: FastifyInstance) {
  // ルームの作成または参加
  let roomId = "1"; // シンプルのため固定
  let room = gameRooms.get(roomId);

  if (!room) {
    room = createGameRoom();
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

    // 2人目のプレイヤーが参加したら、ゲームの開始処理を行う
    startGameCountdown(room);
  } else {
    // 既に2人接続している場合は接続を閉じる
    connection.close();
    return;
  }

  // メッセージ処理のイベントリスナーを設定
  connection.on("message", (message: Buffer) => {
    handlePlayerMessage(message, room!, playerSide);
  });

  // 切断処理のイベントリスナーを設定
  connection.on("close", () => {
    handlePlayerDisconnect(room!, playerSide, roomId);
  });

  // 初期状態を送信
  connection.send(
    JSON.stringify({
      type: "init",
      side: playerSide,
      gameState: room.gameState,
    })
  );
}

/**
 * プレイヤーからのメッセージを処理する関数
 */
function handlePlayerMessage(message: Buffer, room: GameRoom, playerSide: "left" | "right") {
  try {
    const data = JSON.parse(message.toString()) as Partial<GameMessage>;
    
    switch (data.type) {
      case "chat":
        if (isChatMessage(data)) {
          handleChatMessage(data, room, playerSide);
        }
        break;
      case "paddleMove":
        if (isPaddleMoveMessage(data)) {
          handlePaddleMove(data, room, playerSide);
        }
        break;
      case "surrender":
        if (isSurrenderMessage(data)) {
          handleSurrender(room, playerSide);
        }
        break;
      default:
        console.error(`Unknown message type: ${data.type}`);
    }
  } catch (error) {
    console.error("Error handling message:", error);
  }
}

/**
 * 型ガード: ChatMessage
 */
function isChatMessage(message: Partial<GameMessage>): message is ChatMessage {
  return message.type === "chat" && 
    typeof (message as ChatMessage).name === "string" && 
    typeof (message as ChatMessage).message === "string";
}

/**
 * 型ガード: PaddleMoveMessage
 */
function isPaddleMoveMessage(message: Partial<GameMessage>): message is PaddleMoveMessage {
  return message.type === "paddleMove" && 
    typeof (message as PaddleMoveMessage).y === "number";
}

/**
 * 型ガード: SurrenderMessage
 */
function isSurrenderMessage(message: Partial<GameMessage>): message is SurrenderMessage {
  return message.type === "surrender";
}

/**
 * チャットメッセージを処理する関数
 */
function handleChatMessage(data: ChatMessage, room: GameRoom, playerSide: "left" | "right") {
  // チャットメッセージを追加
  room.chats.push({
    name: data.name,
    message: data.message,
  });

  // 自分自身に送信
  const player = room.players[playerSide];
  if (player) {
    // 元の実装と同じ形式でチャットデータを送信
    player.send(JSON.stringify(room.chats));
  }
  
  // 相手プレイヤーに送信
  const opponent = playerSide === "left" ? room.players.right : room.players.left;
  if (opponent) {
    opponent.send(JSON.stringify(room.chats));
  }
}

/**
 * パドル移動を処理する関数
 */
function handlePaddleMove(data: PaddleMoveMessage, room: GameRoom, playerSide: "left" | "right") {
  // パドル位置を更新
  if (playerSide === "left") {
    room.gameState.paddleLeft.y = data.y;
  } else {
    room.gameState.paddleRight.y = data.y;
  }

  // 相手プレイヤーに状態を送信
  const opponent = playerSide === "left" ? room.players.right : room.players.left;
  if (opponent) {
    opponent.send(JSON.stringify(room.gameState));
  }
}

/**
 * 新しいゲームルームを作成する関数
 */
function createGameRoom(): GameRoom {
  return {
    players: {},
    gameState: {
      ball: {
        x: GAME_CONSTANTS.CANVAS_WIDTH / 2,
        y: GAME_CONSTANTS.CANVAS_HEIGHT / 2,
        dx: GAME_CONSTANTS.INITIAL_BALL_SPEED,
        dy: GAME_CONSTANTS.INITIAL_BALL_SPEED,
        radius: GAME_CONSTANTS.BALL_RADIUS,
      },
      paddleLeft: {
        x: GAME_CONSTANTS.PADDLE_LEFT_X,
        y: GAME_CONSTANTS.CANVAS_HEIGHT / 2 - GAME_CONSTANTS.PADDLE_HEIGHT / 2,
        width: GAME_CONSTANTS.PADDLE_WIDTH,
        height: GAME_CONSTANTS.PADDLE_HEIGHT,
      },
      paddleRight: {
        x: GAME_CONSTANTS.PADDLE_RIGHT_X,
        y: GAME_CONSTANTS.CANVAS_HEIGHT / 2 - GAME_CONSTANTS.PADDLE_HEIGHT / 2,
        width: GAME_CONSTANTS.PADDLE_WIDTH,
        height: GAME_CONSTANTS.PADDLE_HEIGHT,
      },
      score: { left: 0, right: 0 },
      gameOver: false,
      winner: null,
      winningScore: GAME_CONSTANTS.WINNING_SCORE,
    },
    chats: [],
    gameStarted: false,
    gameIntervals: {}, // タイマー参照を保持するためのオブジェクト
  };
}

/**
 * ゲームカウントダウンを開始する関数
 */
function startGameCountdown(room: GameRoom) {
  let countdown = GAME_CONSTANTS.COUNTDOWN_SECONDS;
  
  // カウントダウンタイマーを設定
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
        startGame(room);
      }
    } else {
      clearInterval(countdownInterval);
    }
  }, 1000);
  
  // タイマー参照を保存
  room.gameIntervals.countdownInterval = countdownInterval;
}

/**
 * ゲームを開始する関数
 */
function startGame(room: GameRoom) {
  room.gameStarted = true;

  // ゲーム開始メッセージを送信
  const gameStartMessage = JSON.stringify({
    type: "gameStart",
    gameState: room.gameState,
  });

  room.players.left?.send(gameStartMessage);
  room.players.right?.send(gameStartMessage);

  // ゲームループを開始
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
        handleGameOver(room);
      }
    } else {
      clearInterval(gameInterval);
    }
  }, 1000 / GAME_CONSTANTS.FPS);
  
  // タイマー参照を保存
  room.gameIntervals.gameInterval = gameInterval;
}

/**
 * ゲーム終了時の処理
 */
function handleGameOver(room: GameRoom) {
  // ゲーム終了メッセージを送信
  const gameOverMessage = JSON.stringify({
    type: "gameOver",
    winner: room.gameState.winner,
    leftScore: room.gameState.score.left,
    rightScore: room.gameState.score.right,
  });

  room.players.left?.send(gameOverMessage);
  room.players.right?.send(gameOverMessage);

  // ゲームループを停止
  if (room.gameIntervals.gameInterval) {
    clearInterval(room.gameIntervals.gameInterval);
    room.gameIntervals.gameInterval = undefined;
  }
  
  // ゲーム状態をリセット
  room.gameStarted = false;
}

/**
 * 降参処理を行う関数 (中断ボタン用)
 */
function handleSurrender(room: GameRoom, playerSide: "left" | "right") {
  if (!room.gameStarted) return;
  
  // 降参したプレイヤーの相手を勝者とする
  const winner = playerSide === "left" ? "right" : "left";
  room.gameState.gameOver = true;
  room.gameState.winner = winner;
  
  // 勝者のスコアを勝利点数にする
  if (winner === "left") {
    room.gameState.score.left = room.gameState.winningScore;
  } else {
    room.gameState.score.right = room.gameState.winningScore;
  }
  
  // ゲーム終了処理
  handleGameOver(room);
}

/**
 * プレイヤーの切断を処理する関数
 */
function handlePlayerDisconnect(room: GameRoom, playerSide: "left" | "right", roomId: string) {
  // プレイヤーの接続を削除
  if (room.players[playerSide]) {
    room.players[playerSide] = undefined;
  }
  
  // ゲームが進行中の場合は、切断したプレイヤーを敗者とする
  if (room.gameStarted) {
    // 残っているプレイヤーを勝者にする
    const winner = playerSide === "left" ? "right" : "left";
    const opponent = room.players[winner];
    
    if (opponent) {
      // 勝者のスコアを勝利点数にする
      if (winner === "left") {
        room.gameState.score.left = room.gameState.winningScore;
      } else {
        room.gameState.score.right = room.gameState.winningScore;
      }
      
      // 勝利メッセージを送信
      const victoryMessage = JSON.stringify({
        type: "gameOver",
        winner: winner,
        reason: "opponent_disconnected",
        message: "相手プレイヤーが切断しました。あなたの勝利です！",
        leftScore: room.gameState.score.left,
        rightScore: room.gameState.score.right,
      });
      
      opponent.send(victoryMessage);
    }
    
    // ゲームを停止
    if (room.gameIntervals.gameInterval) {
      clearInterval(room.gameIntervals.gameInterval);
      room.gameIntervals.gameInterval = undefined;
    }
    
    room.gameStarted = false;
    room.gameState.gameOver = true;
  }
  
  // カウントダウン中の場合はカウントダウンを停止
  if (room.gameIntervals.countdownInterval) {
    clearInterval(room.gameIntervals.countdownInterval);
    room.gameIntervals.countdownInterval = undefined;
  }

  // ルームが空になったら削除
  if (!room.players.left && !room.players.right) {
    // すべてのインターバルをクリア
    Object.values(room.gameIntervals).forEach(interval => {
      if (interval) clearInterval(interval);
    });
    
    gameRooms.delete(roomId);
  }
}
