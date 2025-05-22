import { GameEngine } from "../../services/game/GameEngine";
import { v4 as uuidv4 } from "uuid";
import type { GameRoom } from "../../types/game";

/**
 * ゲーム関連のデフォルト設定
 */
const DEFAULT_GAME_SETTINGS = {
  // ボール設定
  BALL_SPEED: 3, // 初期値を3に変更

  // ゲーム設定
  WINNING_SCORE: 10,
};

/**
 * ゲーム関連の固定定数定義
 */
const GAME_CONSTANTS = {
  // キャンバスサイズ
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,

  // ボール設定
  BALL_RADIUS: 10,

  // パドル設定
  PADDLE_WIDTH: 10,
  PADDLE_HEIGHT: 100,
  PADDLE_LEFT_X: 50,
  PADDLE_RIGHT_X: 740,

  // ゲーム設定
  COUNTDOWN_SECONDS: 5,
  FPS: 60,
};

/**
 * WebSocketメッセージの種類
 */
export enum MessageType { // Not Used yet
  // ゲーム初期化・進行関連
  INIT = "init",
  COUNTDOWN = "countdown",
  GAME_START = "gameStart",
  GAME_STATE = "gameState",
  GAME_OVER = "gameOver",

  // プレイヤー操作関連
  PADDLE_MOVE = "paddleMove",
  PADDLE_STATE = "paddleState",
  SURRENDER = "surrender",

  // 設定関連
  GAME_SETTINGS = "gameSettings",

  // コミュニケーション関連
  CHAT = "chat",
}

/**
 * 新しいゲームルームを作成する関数
 */
export function createGameRoom(): GameRoom {
  // デフォルト設定値を取得
  const defaultBallSpeed = DEFAULT_GAME_SETTINGS.BALL_SPEED;
  const defaultWinningScore = DEFAULT_GAME_SETTINGS.WINNING_SCORE;

  return {
    players: {},
    gameState: {
      ball: {
        x: GAME_CONSTANTS.CANVAS_WIDTH / 2,
        y: GAME_CONSTANTS.CANVAS_HEIGHT / 2,
        dx: defaultBallSpeed * (Math.random() > 0.5 ? 1 : -1),
        dy: defaultBallSpeed * (Math.random() > 0.5 ? 1 : -1),
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
      winningScore: defaultWinningScore,
      ballSpeed: defaultBallSpeed, // ここで明示的にballSpeedを初期化
    },
    chats: [],
    gameStarted: false,
    gameIntervals: {}, // タイマー参照を保持するためのオブジェクト
    settings: {
      ballSpeed: defaultBallSpeed,
      winningScore: defaultWinningScore,
    },
    leftPlayerReady: false, // 左側プレイヤーの準備状態
  };
}

/**
 * ゲームカウントダウンを開始する関数
 */
export function startGameCountdown(room: GameRoom) {
  let countdown = GAME_CONSTANTS.COUNTDOWN_SECONDS;

  // カウントダウンタイマーを設定
  const countdownInterval = setInterval(() => {
    if (room?.players?.left && room?.players?.right) {
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
export function startGame(room: GameRoom) {
  room.gameStarted = true;

  // カスタム設定を適用したボール初期化
  const speed = room.settings.ballSpeed;

  // ゲーム状態にボールスピードを保存
  room.gameState.ballSpeed = speed;

  // 初期ボール状態も設定
  room.gameState.ball = {
    x: GAME_CONSTANTS.CANVAS_WIDTH / 2,
    y: GAME_CONSTANTS.CANVAS_HEIGHT / 2,
    dx: speed * (Math.random() > 0.5 ? 1 : -1),
    dy: speed * (Math.random() > 0.5 ? 1 : -1),
    radius: GAME_CONSTANTS.BALL_RADIUS,
  };

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

export function checkAndStartGame(room: GameRoom): void {
  // 両方のプレイヤーが接続済みで左側プレイヤーの準備が完了していれば開始
  console.log("Game is ready...");

  if (room.players.left && room.players.right && room.leftPlayerReady) {
    // ゲーム開始処理...
    console.log("Game is ready to start");

    // 両プレイヤーにゲーム開始を通知
    const startMessage = JSON.stringify({
      type: "gameStart",
      gameState: room.gameState,
    });
    room.players.left.send(startMessage);
    room.players.right.send(startMessage);
    startGameCountdown(room);
  }
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
 * 新しいプレイヤーを配置するルームを見つける関数
 * @returns 利用可能なルームとそのID
 */
export function findAvailableRoom(gameRooms: Map<string, GameRoom>): {
  roomId: string;
  room: GameRoom;
} {
  // 既存の空きルームを探す
  for (const [id, room] of gameRooms.entries()) {
    // 両方のプレイヤースロットが埋まっていないルームを見つける
    if (!room.players.left || !room.players.right) {
      return { roomId: id, room };
    }
  }

  // 空きルームがない場合は新しいルームを作成
  const newRoomId = uuidv4();
  const newRoom = createGameRoom();
  gameRooms.set(newRoomId, newRoom);
  return { roomId: newRoomId, room: newRoom };
}
