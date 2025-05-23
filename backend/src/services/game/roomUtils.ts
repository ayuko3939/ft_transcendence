import { GameEngine } from "../../services/game/GameEngine";
import { v4 as uuidv4 } from "uuid";
import type { GameRoom } from "../../types/game";
import type { GameState, GameSettings } from "../../types/shared/types";
import { CANVAS, BALL, PADDLE, GAME } from "../../types/shared/constants";

/**
 * 新しいゲームルームを作成する関数
 */
export function createGameRoom(): GameRoom {
  // デフォルト設定値を取得
  const defaultBallSpeed = BALL.DEFAULT_SPEED;
  const defaultWinningScore = GAME.DEFAULT_WINNING_SCORE;

  return {
    id: uuidv4(),
    players: {},
    state: {
      ball: {
        x: CANVAS.WIDTH / 2,
        y: CANVAS.HEIGHT / 2,
        dx: defaultBallSpeed * (Math.random() > 0.5 ? 1 : -1),
        dy: defaultBallSpeed * (Math.random() > 0.5 ? 1 : -1),
        radius: BALL.RADIUS,
      },
      paddleLeft: {
        x: PADDLE.LEFT_X,
        y: CANVAS.HEIGHT / 2 - PADDLE.HEIGHT / 2,
        width: PADDLE.WIDTH,
        height: PADDLE.HEIGHT,
      },
      paddleRight: {
        x: PADDLE.RIGHT_X,
        y: CANVAS.HEIGHT / 2 - PADDLE.HEIGHT / 2,
        width: PADDLE.WIDTH,
        height: PADDLE.HEIGHT,
      },
      score: { left: 0, right: 0 },
      status: 'waiting',
      winner: null,
      winningScore: defaultWinningScore,
    },
    chats: [],
    settings: {
      ballSpeed: defaultBallSpeed,
      winningScore: defaultWinningScore,
    },
    timers: {},
    leftPlayerReady: false,
  };
}

/**
 * ゲームカウントダウンを開始する関数
 */
export function startGameCountdown(room: GameRoom) {
  let countdown = GAME.COUNTDOWN_SECONDS;

  // ゲーム状態を'countdown'に変更
  room.state.status = 'countdown';

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
  room.timers.countdown = countdownInterval;
}

/**
 * ゲームを開始する関数
 */
export function startGame(room: GameRoom) {
  // カスタム設定を適用したボール初期化
  const speed = room.settings.ballSpeed;

  // 初期ボール状態を設定
  room.state.ball = {
    x: CANVAS.WIDTH / 2,
    y: CANVAS.HEIGHT / 2,
    dx: speed * (Math.random() > 0.5 ? 1 : -1),
    dy: speed * (Math.random() > 0.5 ? 1 : -1),
    radius: BALL.RADIUS,
  };

  // ゲーム状態を'playing'に変更
  room.state.status = 'playing';

  // ゲーム開始メッセージを送信
  const gameStartMessage = JSON.stringify({
    type: "gameStart",
    state: room.state,
  });

  room.players.left?.send(gameStartMessage);
  room.players.right?.send(gameStartMessage);

  // ゲームループを開始
  const gameEngine = new GameEngine(room.state, room.settings);
  const gameInterval = setInterval(() => {
    if (room.state.status === 'playing' && room.players.left && room.players.right) {
      gameEngine.update();

      // 両プレイヤーに状態を送信
      const stateMessage = JSON.stringify({
        type: "gameState",
        state: room.state,
      });

      room.players.left.send(stateMessage);
      room.players.right.send(stateMessage);

      // ゲームが終了した場合
      if ((room.state.status as 'waiting' | 'countdown' | 'playing' | 'finished') === 'finished') {
        handleGameOver(room);
      }
    } else {
      clearInterval(gameInterval);
    }
  }, 1000 / GAME.FPS);

  // タイマー参照を保存
  room.timers.game = gameInterval;
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
      state: room.state,
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
    result: {
      winner: room.state.winner,
      finalScore: {
        left: room.state.score.left,
        right: room.state.score.right,
      },
    },
  });

  room.players.left?.send(gameOverMessage);
  room.players.right?.send(gameOverMessage);

  // ゲームループを停止
  if (room.timers.game) {
    clearInterval(room.timers.game);
    room.timers.game = undefined;
  }

  // ゲーム状態を待機状態にリセット
  room.state.status = 'waiting';
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
