import type { WebSocket } from "@fastify/websocket";
import type { GameState } from "../GameState";

export type PlayerRole = "left" | "right" | "spectator";

export interface Player {
  id: string;
  name: string;
  socket: WebSocket;
  role: PlayerRole;
}

export type SessionStatus = "waiting" | "countdown" | "playing" | "finished";

export interface GameSession {
  id: string;
  name: string;
  status: SessionStatus;
  players: Player[];
  gameState: GameState;
  createdAt: number;
  maxPlayers: number;
  countdown?: number;
  chats: ChatMessage[];
}

export interface ChatMessage {
  playerId: string;
  name: string;
  message: string;
  timestamp: number;
}

export interface SessionInfo {
  id: string;
  name: string;
  status: SessionStatus;
  players: {
    id: string;
    name: string;
    role: PlayerRole;
  }[];
  createdAt: number;
  maxPlayers: number;
}

export type WebSocketMessageType =
  | "createSession"
  | "joinSession"
  | "leaveSession"
  | "listSessions"
  | "startGame"
  | "paddleMove"
  | "chat"
  | "spectateSession";

export interface WebSocketRequest {
  type: WebSocketMessageType;
  sessionId?: string;
  sessionName?: string;
  playerId?: string;
  playerName?: string;
  role?: PlayerRole;
  y?: number;
  message?: string;
}

export type WebSocketResponseType =
  | "sessionCreated"
  | "sessionJoined"
  | "sessionLeft"
  | "sessionsList"
  | "sessionUpdated"
  | "gameState"
  | "countdown"
  | "gameStart"
  | "chatMessage"
  | "error";

export interface WebSocketResponse {
  type: WebSocketResponseType;
  sessionId?: string;
  session?: GameSession;
  sessions?: SessionInfo[];
  error?: string;
  gameState?: GameState;
  count?: number;
  message?: string;
  chat?: ChatMessage;
  chats?: ChatMessage[];
  playerId?: string;
  playerRole?: PlayerRole;
}
