import type { WebSocket } from "@fastify/websocket";
import { v4 as uuidv4 } from "uuid";

import type { PlayerRole, WebSocketRequest } from "./types/session";
import { sessionManager } from "./SessionManager";

const playerSockets = new Map<WebSocket, { id: string; name: string }>();

export function handleWebSocket(socket: WebSocket) {
  let playerId: string;
  let playerName: string;
  let isInitialized = false;

  socket.on("message", (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString()) as WebSocketRequest;
      if (!isInitialized) {
        playerId = data.playerId ?? uuidv4();
        playerName = data.playerName ?? `Player_${playerId.substring(0, 6)}`;

        playerSockets.set(socket, {
          id: playerId,
          name: playerName,
        });
        isInitialized = true;
        console.log(`New player initialized: ${playerName} (${playerId})`);
      }

      switch (data.type) {
        case "createSession":
          handleCreateSession(socket, playerId, data);
          break;

        case "joinSession":
          handleJoinSession(socket, playerId, data);
          break;

        case "spectateSession":
          handleSpectateSession(socket, playerId, data);
          break;

        case "leaveSession":
          handleLeaveSession(socket, playerId);
          break;

        case "listSessions":
          handleListSessions(socket);
          break;

        case "startGame":
          handleStartGame(socket, playerId, data);
          break;

        case "paddleMove":
          handlePaddleMove(socket, playerId, data);
          break;

        case "chat":
          handleChatMessage(socket, playerId, data);
          break;

        default:
          sendError(socket, `Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
      sendError(socket, "Invalid message format");
    }
  });

  // 接続が閉じられた時の処理
  socket.on("close", () => {
    sessionManager.playerLeft(playerId);
    playerSockets.delete(socket);
  });
  handleListSessions(socket);
}

/**
 * 新しいセッションを作成
 */
function handleCreateSession(
  socket: WebSocket,
  playerId: string,
  data: WebSocketRequest,
) {
  const playerInfo = playerSockets.get(socket);
  if (!playerInfo) return;

  if (data.playerName) {
    playerInfo.name = data.playerName;
    playerSockets.set(socket, playerInfo);
  }

  const sessionName = data.sessionName || `Game_${playerId.substring(0, 6)}`;

  const session = sessionManager.createSession(
    sessionName,
    playerId,
    playerInfo.name,
    socket,
  );

  socket.send(
    JSON.stringify({
      type: "sessionCreated",
      sessionId: session.id,
      session: session.getSessionInfo(),
      playerId,
      playerRole: "left", // 作成者は左側プレイヤー
    }),
  );

  broadcastSessionsList();
}

/**
 * 既存のセッションに参加
 */
function handleJoinSession(
  socket: WebSocket,
  playerId: string,
  data: WebSocketRequest,
) {
  if (!data.sessionId) {
    return sendError(socket, "Session ID is required");
  }

  const playerInfo = playerSockets.get(socket);
  if (!playerInfo) return;

  if (data.playerName) {
    playerInfo.name = data.playerName;
    playerSockets.set(socket, playerInfo);
  }

  const session = sessionManager.getSession(data.sessionId);
  if (!session) {
    return sendError(socket, "Session not found");
  }

  const isFull = session.getPlayersCount() >= session.maxPlayers;
  if (isFull && data.role !== "spectator") {
    return sendError(socket, "Session is full");
  }

  let role: PlayerRole = "spectator";
  if (!isFull) {
    const hasLeft = session.players.some((p) => p.role === "left");
    const hasRight = session.players.some((p) => p.role === "right");

    if (!hasLeft) {
      role = "left";
    } else if (!hasRight) {
      role = "right";
    }
  }

  if (data.role) {
    if (
      (data.role === "left" &&
        !session.players.some((p) => p.role === "left")) ||
      (data.role === "right" &&
        !session.players.some((p) => p.role === "right")) ||
      data.role === "spectator"
    ) {
      role = data.role;
    }
  }

  const player = session.addPlayer(playerId, playerInfo.name, socket, role);

  socket.send(
    JSON.stringify({
      type: "sessionJoined",
      sessionId: session.id,
      session: session.getSessionInfo(),
      playerId,
      playerRole: player.role,
    }),
  );

  if (session.chats.length > 0) {
    socket.send(
      JSON.stringify({
        type: "chatMessage",
        chats: session.chats,
        sessionId: session.id,
      }),
    );
  }

  broadcastSessionsList();
}

/**
 * セッションを観戦する
 */
function handleSpectateSession(
  socket: WebSocket,
  playerId: string,
  data: WebSocketRequest,
) {
  const spectatorData = {
    ...data,
    role: "spectator" as PlayerRole,
  };
  handleJoinSession(socket, playerId, spectatorData);
}

/**
 * セッションから退出
 */
function handleLeaveSession(socket: WebSocket, playerId: string) {
  sessionManager.playerLeft(playerId);

  socket.send(
    JSON.stringify({
      type: "sessionLeft",
      playerId,
    }),
  );
  broadcastSessionsList();
}

/**
 * セッションリストを取得
 */
function handleListSessions(socket: WebSocket) {
  const sessions = sessionManager.getAllSessions();

  socket.send(
    JSON.stringify({
      type: "sessionsList",
      sessions,
    }),
  );
}

/**
 * ゲームを開始
 */
function handleStartGame(
  socket: WebSocket,
  playerId: string,
  data: WebSocketRequest,
) {
  if (!data.sessionId) {
    return sendError(socket, "Session ID is required");
  }

  const session = sessionManager.getSession(data.sessionId);
  if (!session) {
    return sendError(socket, "Session not found");
  }

  // 開始のルール
  // - プレイヤーがセッションのメンバーかつホスト（左側プレイヤー）
  // - セッションに両方のプレイヤーがいる場合
  // - ゲームがすでに進行中でない
  const player = session.players.find((p) => p.id === playerId);
  if (!player || player.role !== "left") {
    return sendError(socket, "Only the host can start the game");
  }
  if (session.getPlayersCount() < 2) {
    return sendError(socket, "Need two players to start the game");
  }
  if (session.status === "playing" || session.status === "countdown") {
    return sendError(socket, "Game is already in progress");
  }
  session.startCountdown();
}

/**
 * パドル移動を処理
 */
function handlePaddleMove(
  socket: WebSocket,
  playerId: string,
  data: WebSocketRequest,
) {
  if (!data.sessionId || data.y === undefined) {
    return sendError(socket, "Session ID and y position are required");
  }

  const session = sessionManager.getSession(data.sessionId);
  if (!session) {
    return sendError(socket, "Session not found");
  }

  const player = session.players.find((p) => p.id === playerId);
  if (!player || (player.role !== "left" && player.role !== "right")) {
    return sendError(socket, "Only players can move paddles");
  }

  session.movePaddle(playerId, data.y);
}

/**
 * チャットメッセージを処理
 */
function handleChatMessage(
  socket: WebSocket,
  playerId: string,
  data: WebSocketRequest,
) {
  if (!data.sessionId || !data.message) {
    return sendError(socket, "Session ID and message are required");
  }

  const session = sessionManager.getSession(data.sessionId);
  if (!session) {
    return sendError(socket, "Session not found");
  }

  const playerInfo = playerSockets.get(socket);
  if (!playerInfo) return;

  const player = session.players.find((p) => p.id === playerId);
  if (!player) {
    return sendError(socket, "You are not a member of this session");
  }
  session.addChatMessage(playerId, player.name, data.message);
}

/**
 * エラーメッセージを送信
 */
function sendError(socket: WebSocket, errorMessage: string) {
  try {
    socket.send(
      JSON.stringify({
        type: "error",
        error: errorMessage,
      }),
    );
  } catch (error) {
    console.error("Error sending error message:", error);
  }
}

/**
 * 全プレイヤーにセッションリストを送信
 */
function broadcastSessionsList() {
  const sessions = sessionManager.getAllSessions();
  const message = JSON.stringify({
    type: "sessionsList",
    sessions,
  });
  for (const [socket] of playerSockets) {
    try {
      socket.send(message);
    } catch (error) {
      console.error("Error broadcasting sessions list:", error);
    }
  }
}
