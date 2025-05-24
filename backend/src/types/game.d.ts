// ===========================================
// バックエンド専用型定義（サーバー・WebSocket用）
// ===========================================

import type { WebSocket } from 'ws';
import type { 
  GameState, 
  GameSettings, 
  ChatMessage,
  ClientMessage,
  PlayerSide
} from "shared/types";

// ===========================================
// ゲームルーム管理
// ===========================================

// ゲームルーム（サーバー上でのゲーム管理単位）
export interface GameRoom {
  id: string;                    // ルームID
  players: {
    left?: WebSocket;            // 左プレイヤーのWebSocket接続
    right?: WebSocket;           // 右プレイヤーのWebSocket接続
  };
  userIds: {
    left?: string;               // 左プレイヤーのユーザーID
    right?: string;              // 右プレイヤーのユーザーID
  };
  state: GameState;              // 現在のゲーム状態
  chats: ChatMessage[];          // チャット履歴
  settings: GameSettings;        // ゲーム設定
  timers: {
    countdown?: NodeJS.Timeout;  // カウントダウンタイマー
    game?: NodeJS.Timeout;       // ゲームループタイマー
  };
  leftPlayerReady: boolean;      // 左プレイヤー(host)の準備完了フラグ
}

// ===========================================
// メッセージ処理
// ===========================================

// メッセージハンドラーに渡すコンテキスト情報
export interface MessageContext {
  room: GameRoom;               // 対象のゲームルーム
  playerSide: PlayerSide;       // メッセージ送信者のプレイヤー位置
  roomId: string;               // ルームID
}

// メッセージハンドラー関数の型
export type MessageHandler = (message: ClientMessage, context: MessageContext) => void;

// ===========================================
// ユーティリティ型
// ===========================================

// ゲームルームのマップ
export type GameRoomsMap = Map<string, GameRoom>;
