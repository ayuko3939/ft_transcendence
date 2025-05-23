// ===========================================
// フロントエンド専用型定義（React・UI用）
// ===========================================

import type { 
  GameState, 
  ChatMessage, 
  GameResult, 
  PlayerSide,
  GameSettings 
} from "./shared/types";

// ===========================================
// React Hook用の型
// ===========================================

// ゲーム状態管理
export interface GameControlState {
  isConnected: boolean;         // WebSocket接続状態
  isWaitingForPlayer: boolean;  // 相手プレイヤー待ち
  isCountdown: boolean;         // カウントダウン中
  countdownValue: number;       // カウントダウン数値
  isPlaying: boolean;           // ゲーム中
  isGameOver: boolean;          // ゲーム終了
}

// UI表示状態
export interface GameUIState {
  showSettings: boolean;           // 設定画面の表示
  showSurrenderDialog: boolean;    // 中断確認ダイアログの表示
  settingsConfirmed: boolean;      // 設定確定済みか
  chatInput: string;               // チャット入力中のテキスト
}

// エラー状態
export interface GameErrorState {
  hasError: boolean;               // エラー発生フラグ
  errorMessage: string;            // エラーメッセージ
}

// ===========================================
// WebSocketクライアント用
// ===========================================

// WebSocketイベントハンドラー
export interface WebSocketHandlers {
  onInit: (side: PlayerSide, state: GameState) => void;
  onGameState: (state: GameState) => void;
  onCountdown: (count: number) => void;
  onGameStart: (state: GameState) => void;
  onGameOver: (result: GameResult) => void;
  onChatUpdate: (messages: ChatMessage[]) => void;
  onWaitingForPlayer: () => void;
}

// ===========================================
// コンポーネントProps型
// ===========================================

// メインゲームコンポーネント
export interface PongGameProps {
  roomId?: string;  // 特定ルームID（指定参加の場合）
}

// ゲームキャンバス
export interface GameCanvasProps {
  gameState: GameState;
  width?: number;
  height?: number;
  className?: string;
}

// チャットコンポーネント
export interface ChatProps {
  messages: ChatMessage[];
  currentInput: string;
  onInputChange: (input: string) => void;
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

// 設定モーダル
export interface GameSettingsProps {
  isOpen: boolean;
  settings: GameSettings;
  onSettingsChange: (settings: GameSettings) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

// 確認ダイアログ
export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// 待機画面
export interface WaitingScreenProps {
  playerSide: PlayerSide;
  roomId?: string;
}

// ゲーム結果画面
export interface GameResultProps {
  result: GameResult;
  playerSide: PlayerSide;
  onBackToHome: () => void;
}

// ===========================================
// Hook戻り値型（統合版）
// ===========================================

// メインゲームHook（WebSocket・Canvas機能も統合）
export interface UseGameHook {
  // 状態
  gameState: GameState;
  playerSide: PlayerSide;
  controlState: GameControlState;
  uiState: GameUIState;
  errorState: GameErrorState;
  chatMessages: ChatMessage[];
  gameResult: GameResult | null;
  
  // ゲームアクション
  sendPaddleMove: (y: number) => void;
  sendChatMessage: (name: string, message: string) => void;
  sendGameSettings: (settings: GameSettings) => void;
  sendSurrender: () => void;
  
  // UI操作
  setShowSettings: (show: boolean) => void;
  setShowSurrenderDialog: (show: boolean) => void;
  setChatInput: (input: string) => void;
  clearError: () => void;
  
  // WebSocket接続操作
  connect: (url: string) => void;
  disconnect: () => void;
  isConnected: boolean;
  
  // Canvas操作
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isRendering: boolean;
  startRendering: () => void;
  stopRendering: () => void;
}
