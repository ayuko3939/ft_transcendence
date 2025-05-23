import type { WebSocket } from "ws";

// トーナメントの状態
export type TournamentStatus = "waiting" | "in_progress" | "completed";

// 参加者の状態
export type ParticipantStatus = "waiting" | "playing" | "won" | "lost";

// 試合の状態
export type MatchStatus = "pending" | "in_progress" | "completed";

// トーナメント参加者情報
export interface TournamentParticipant {
  userId: string;
  userName: string;
  userImage?: string;
  status: ParticipantStatus;
  finalRank?: number;
  joinedAt: number;
}

// ブラケット試合情報
export interface BracketMatch {
  id: string;
  tournamentId: string;
  round: number;
  matchNumber: number;
  player1Id?: string;
  player2Id?: string;
  player1Name?: string;
  player2Name?: string;
  status: MatchStatus;
  winnerId?: string;
  gameRoomId?: string;
  createdAt: number;
}

// トーナメント情報
export interface Tournament {
  id: string;
  name: string;
  hostId: string;
  status: TournamentStatus;
  maxPlayers: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  participants: TournamentParticipant[];
  bracket: BracketMatch[];
}

// WebSocket接続管理
export interface TournamentConnection {
  socket: WebSocket;
  userId: string;
  userName: string;
}

// トーナメントルーム
export interface TournamentRoom {
  tournament: Tournament;
  connections: Map<string, TournamentConnection>;
  chatMessages: TournamentChatMessage[];
}

// チャットメッセージ
export interface TournamentChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
}

// WebSocketメッセージ型定義

// Client → Server メッセージ
export interface ChatMessageRequest {
  type: "chat_message";
  message: string;
}

export interface ReadyStatusRequest {
  type: "ready_status";
  isReady: boolean;
}

export type TournamentClientMessage = ChatMessageRequest | ReadyStatusRequest;

// Server → Client メッセージ
export interface ParticipantJoinedMessage {
  type: "participant_joined";
  participant: TournamentParticipant;
  totalParticipants: number;
}

export interface ParticipantLeftMessage {
  type: "participant_left";
  userId: string;
  totalParticipants: number;
}

export interface TournamentStartingMessage {
  type: "tournament_starting";
  message: string;
}

export interface BracketGeneratedMessage {
  type: "bracket_generated";
  bracket: BracketMatch[];
  totalRounds: number;
}

export interface MatchReadyMessage {
  type: "match_ready";
  matchId: string;
  gameRoomId: string;
  round: number;
  matchNumber: number;
  opponent: {
    id: string;
    name: string;
    image?: string;
  };
}

export interface MatchResultMessage {
  type: "match_result";
  matchId: string;
  winnerId: string;
  winnerName: string;
  loserId: string;
  loserName: string;
  score: {
    winner: number;
    loser: number;
  };
}

export interface TournamentStatusUpdateMessage {
  type: "tournament_status_update";
  status: TournamentStatus;
  currentRound?: number;
  totalRounds?: number;
  winnerId?: string;
  winnerName?: string;
}

export interface ChatMessageBroadcast {
  type: "chat_message";
  message: TournamentChatMessage;
}

export interface TournamentStateMessage {
  type: "tournament_state";
  tournament: Tournament;
  chatMessages: TournamentChatMessage[];
}

export type TournamentServerMessage =
  | ParticipantJoinedMessage
  | ParticipantLeftMessage
  | TournamentStartingMessage
  | BracketGeneratedMessage
  | MatchReadyMessage
  | MatchResultMessage
  | TournamentStatusUpdateMessage
  | ChatMessageBroadcast
  | TournamentStateMessage;

// ブラケット生成の結果
export interface BracketGenerationResult {
  matches: BracketMatch[];
  totalRounds: number;
  participantCount: number;
}
