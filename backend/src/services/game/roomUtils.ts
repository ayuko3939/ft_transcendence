import { GameEngine } from "../../services/game/GameEngine";
import { v4 as uuidv4 } from "uuid";
import type { GameRoom } from "../../types/game";
import type { GameState, GameSettings } from "../../types/shared/types";
import { CANVAS, BALL, PADDLE, GAME } from "../../types/shared/constants";

export function createGameRoom(): GameRoom {
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

export function startGameCountdown(room: GameRoom) {
  let countdown = GAME.COUNTDOWN_SECONDS;

  room.state.status = 'countdown';

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

  room.state.status = 'playing';

  const gameStartMessage = JSON.stringify({
    type: "gameStart",
    state: room.state,
  });

  room.players.left?.send(gameStartMessage);
  room.players.right?.send(gameStartMessage);

  const gameEngine = new GameEngine(room.state, room.settings);
  const gameInterval = setInterval(() => {
    if (room.state.status === 'playing' && room.players.left && room.players.right) {
      gameEngine.update();

      const stateMessage = JSON.stringify({
        type: "gameState",
        state: room.state,
      });

      room.players.left.send(stateMessage);
      room.players.right.send(stateMessage);

      if ((room.state.status as 'waiting' | 'countdown' | 'playing' | 'finished') === 'finished') {
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
    const startMessage = JSON.stringify({
      type: "gameStart",
      state: room.state,
    });
    room.players.left.send(startMessage);
    room.players.right.send(startMessage);
    startGameCountdown(room);
  }
}

function handleGameOver(room: GameRoom) {
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

  if (room.timers.game) {
    clearInterval(room.timers.game);
    room.timers.game = undefined;
  }

  room.state.status = 'waiting';
}

export function findAvailableRoom(gameRooms: Map<string, GameRoom>): {
  roomId: string;
  room: GameRoom;
} {
  for (const [id, room] of gameRooms.entries()) {
    if (!room.players.left || !room.players.right) {
      return { roomId: id, room };
    }
  }

  const newRoomId = uuidv4();
  const newRoom = createGameRoom();
  gameRooms.set(newRoomId, newRoom);
  return { roomId: newRoomId, room: newRoom };
}
