import { GameEngine } from "../../services/game/GameEngine";
import { saveGameResult } from "./saveGameResult";
import { v4 as uuidv4 } from "uuid";
import type { GameRoom } from "../../types/game";
import type {
  GameState,
  GameSettings,
  GameType,
} from "@ft-transcendence/shared";
import { CANVAS, BALL, PADDLE, GAME } from "@ft-transcendence/shared";

/**
 * トーナメントマッチのゲームルーム管理用の型
 */
export interface TournamentGameInfo {
  roomId: string;
  room: GameRoom;
  player1Id: string;
  player2Id: string;
}

export function createGameRoom(gameType: GameType = "online"): GameRoom {
  const defaultBallSpeed = BALL.DEFAULT_SPEED;
  const defaultWinningScore = GAME.DEFAULT_WINNING_SCORE;

  return {
    id: uuidv4(),
    players: {},
    userIds: {},
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
      status: "connecting",
      winner: null,
      winningScore: defaultWinningScore,
      gameType: gameType,
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

export function startGameCountdown(room: GameRoom) {
  let countdown = GAME.COUNTDOWN_SECONDS;

  room.state.status = "countdown";

  const countdownInterval = setInterval(() => {
    if (room?.players?.left && room?.players?.right) {
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

  room.timers.countdown = countdownInterval;
}

export function startGame(room: GameRoom) {
  const speed = room.settings.ballSpeed;

  room.state.ball = {
    x: CANVAS.WIDTH / 2,
    y: CANVAS.HEIGHT / 2,
    dx: speed * (Math.random() > 0.5 ? 1 : -1),
    dy: speed * (Math.random() > 0.5 ? 1 : -1),
    radius: BALL.RADIUS,
  };

  room.state.status = "playing";

  const gameStartMessage = JSON.stringify({
    type: "gameStart",
    state: room.state,
  });

  room.players.left?.send(gameStartMessage);
  room.players.right?.send(gameStartMessage);

  const gameEngine = new GameEngine(room.state, room.settings);
  const gameInterval = setInterval(() => {
    if (
      room.state.status === "playing" &&
      room.players.left &&
      room.players.right
    ) {
      gameEngine.update();

      const stateMessage = JSON.stringify({
        type: "gameState",
        state: room.state,
      });

      room.players.left.send(stateMessage);
      room.players.right.send(stateMessage);

      if (room.state.status === "finished") {
        handleGameOver(room);
      }
    } else {
      clearInterval(gameInterval);
    }
  }, 1000 / GAME.FPS);

  room.timers.game = gameInterval;
}

export function checkAndStartGame(room: GameRoom): void {
  if (room.players.left && room.players.right && room.leftPlayerReady) {
    // 両プレイヤーがいて設定完了 → カウントダウン開始
    startGameCountdown(room);
  } else if (room.leftPlayerReady && !room.players.right) {
    // leftが設定完了したがrightがいない → leftを待機状態に
    room.state.status = "waiting";
    const waitingMessage = JSON.stringify({
      type: "waitingForPlayer",
    });
    if (room.players.left) {
      room.players.left.send(waitingMessage);
    }
  } else if (room.players.right && !room.leftPlayerReady) {
    // rightがいるがleftが設定待ち → rightを待機状態に
    room.state.status = "waiting";
    const waitingMessage = JSON.stringify({
      type: "waitingForPlayer",
    });
    room.players.right.send(waitingMessage);
  }
}

/**
 * トーナメント用のゲーム開始チェック（設定不要）
 */
export function checkAndStartTournamentGame(room: GameRoom): void {
  if (room.players.left && room.players.right) {
    // 両プレイヤーがいれば即座にカウントダウン開始
    startGameCountdown(room);
  }
}

function handleGameOver(room: GameRoom) {
  const leftPlayer = room.players.left;
  const rightPlayer = room.players.right;
  
  if (!leftPlayer || !rightPlayer) return;

  const gameResult = {
    winner: room.state.winner,
    finalScore: {
      left: room.state.score.left,
      right: room.state.score.right,
    },
    message:
      room.state.gameType === "tournament"
        ? "トーナメント戦が終了しました"
        : undefined,
  };

  // 左プレイヤーにメッセージ送信（対戦相手は右プレイヤー）
  const leftMessage = JSON.stringify({
    type: "gameOver",
    result: gameResult,
    opponentUserId: room.userIds.right,
  });
  leftPlayer.send(leftMessage);

  // 右プレイヤーにメッセージ送信（対戦相手は左プレイヤー）
  const rightMessage = JSON.stringify({
    type: "gameOver",
    result: gameResult,
    opponentUserId: room.userIds.left,
  });
  rightPlayer.send(rightMessage);

  if (room.timers.game) {
    clearInterval(room.timers.game);
    room.timers.game = undefined;
  }

  room.state.status = "finished";

  // ローカル対戦ではDB保存をスキップ
  if (room.state.gameType !== "local") {
    saveGameResult(room, "completed");
  }
}

export function findAvailableRoom(gameRooms: Map<string, GameRoom>): {
  roomId: string;
  room: GameRoom;
} {
  for (const [id, room] of gameRooms.entries()) {
    // finished状態のルームは除外
    if (room.state.status === "finished") {
      continue;
    }
    if (!room.players.left || !room.players.right) {
      return { roomId: id, room };
    }
  }

  const newRoomId = uuidv4();
  const newRoom = createGameRoom("online");
  gameRooms.set(newRoomId, newRoom);
  return { roomId: newRoomId, room: newRoom };
}

/**
 * トーナメント専用のゲームルームを作成
 */
export function createTournamentGameRoom(
  tournamentId: string,
  matchId: string,
  gameRooms: Map<string, GameRoom>,
): { roomId: string; room: GameRoom } {
  const roomId = uuidv4();
  const room = createGameRoom("tournament");

  // トーナメント情報を設定
  room.tournamentId = tournamentId;
  room.tournamentMatchId = matchId;

  // トーナメントでは設定済みですぐ開始
  room.leftPlayerReady = true;

  gameRooms.set(roomId, room);
  return { roomId, room };
}
