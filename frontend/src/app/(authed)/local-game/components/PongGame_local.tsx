"use client";

import type {
  ChatMessage,
  GameResult,
  GameSettings,
  GameState,
  PlayerSide,
} from "@ft-transcendence/shared";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LocalPongController } from "@/lib/game/gameController_local";
import { LocalPongSocketClient } from "@/lib/game/webSocketClient_local";
import { BALL, CANVAS, GAME, PADDLE } from "@ft-transcendence/shared";
import { useSession } from "next-auth/react";

import LocalGameCanvas from "./GameCanvas_local";
import GameSettingsModal from "../../game/_components/GameSettingsModal";
import GameResultModal from "../../game/_components/GameResultModal";
import ConfirmDialog from "../../game/_components/ConfirmDialog";
import styles from "../../game/_components/game.module.css";

const initialGameState: GameState = {
  ball: {
    x: CANVAS.WIDTH / 2,
    y: CANVAS.HEIGHT / 2,
    dx: BALL.DEFAULT_SPEED * (Math.random() > 0.5 ? 1 : -1),
    dy: BALL.DEFAULT_SPEED * (Math.random() > 0.5 ? 1 : -1),
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
  status: "setup",
  winner: null,
  winningScore: GAME.DEFAULT_WINNING_SCORE,
  gameType: "local",
};

const LocalPongGame = () => {
  // セッション情報を取得
  const { data: session } = useSession();

  // 基本状態
  const [playerSide, setPlayerSide] = useState<PlayerSide>(null);
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // ゲーム設定
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    ballSpeed: BALL.DEFAULT_SPEED,
    winningScore: GAME.DEFAULT_WINNING_SCORE,
  });

  // UI状態
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);

  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<LocalPongController | null>(null);
  const socketClientRef = useRef<LocalPongSocketClient | null>(null);

  // WebSocket接続の初期化
  useEffect(() => {
    // セッション情報がない場合は接続しない
    if (!session?.user?.id) {
      return;
    }

    const socketClient = new LocalPongSocketClient({
      onInit: (side, state) => {
        setPlayerSide(side);
        setGameState(state);
      },
      onGameState: setGameState,
      onChatMessages: setChatMessages,
      onCountdown: (count) => {
        setCountdown(count);
        setGameState((prev) => ({ ...prev, status: "countdown" }));
      },
      onGameStart: (state) => {
        setCountdown(null);
        setGameState(state);
      },
      onGameOver: (result) => {
        setGameResult(result);
        setGameState((prev) => ({
          ...prev,
          status: "finished",
          winner: result.winner,
        }));
      },
      onWaitingForPlayer: () => {
        setGameState((prev) => ({ ...prev, status: "waiting" }));
      },
    });

    socketClientRef.current = socketClient;
    // ユーザーIDを認証情報として送信
    socketClient.connect(session.user.id);

    return () => {
      socketClient.disconnect();
    };
  }, [session?.user?.id]);

  // ゲームコントローラーの初期化と状態同期
  useEffect(() => {
    const canvas = canvasRef.current;
    const socketClient = socketClientRef.current;

    if (!canvas || !socketClient) return;

    // コントローラーを作成（初回のみ）
    if (!controllerRef.current) {
      controllerRef.current = new LocalPongController(
        canvas,
        gameState,
        socketClient,
      );
      controllerRef.current.start();
    }

    // 状態を同期（毎回）
    controllerRef.current.updateGameState(gameState);

    // アンマウント時のクリーンアップ
    return () => {
      if (controllerRef.current) {
        controllerRef.current.stop();
        controllerRef.current = null;
      }
    };
  }, [gameState]);

  // ゲーム設定確定処理
  const handleConfirmSettings = () => {
    if (socketClientRef.current) {
      socketClientRef.current.sendGameSettings(gameSettings);
    }
  };

  // 中断処理
  const handleSurrender = () => {
    if (socketClientRef.current) {
      socketClientRef.current.sendSurrenderMessage();
      socketClientRef.current.disconnect();
      router.push("/");
    }
    setShowSurrenderConfirm(false);
  };

  // ホームに戻る処理
  const handleBackToHome = () => {
    if (socketClientRef.current) socketClientRef.current.disconnect();
    router.push("/");
  };

  // 背景制御ロジック
  const shouldDarkenBackground =
    gameState.status !== "playing" || showSurrenderConfirm;

  return (
    <div className={styles.container}>
      {/* 背景暗化レイヤー */}
      {shouldDarkenBackground && <div className={styles.darkBackground} />}

      <LocalGameCanvas
        canvasRef={canvasRef}
        countdown={countdown}
        gameState={gameState}
        onSurrender={() => setShowSurrenderConfirm(true)}
      />

      <GameSettingsModal
        show={gameState.status === "setup"}
        settings={gameSettings}
        onSettingsChange={setGameSettings}
        onConfirm={handleConfirmSettings}
      />

      <GameResultModal
        show={gameState.status === "finished" && gameResult !== null}
        result={gameResult}
        playerSide="left" // ローカル対戦では固定（操作者視点）
        onBackToHome={handleBackToHome}
      />

      <ConfirmDialog
        show={showSurrenderConfirm}
        title="ゲーム中断"
        message="ゲームを中断しますか？"
        onConfirm={handleSurrender}
        onCancel={() => setShowSurrenderConfirm(false)}
      />

      {/* ローカル対戦用の操作説明 */}
      <div className="mt-4 text-center text-white">
        <p className="text-sm mb-2">操作方法</p>
        <p className="text-xs">プレイヤー1（左）: W/S キー | プレイヤー2（右）: ↑/↓ キー</p>
      </div>
    </div>
  );
};

export default LocalPongGame;
