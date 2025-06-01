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
import { PongController } from "@/lib/game/gameController";
import { PongSocketClient } from "@/lib/game/webSocketClient";
import { BALL, CANVAS, GAME, PADDLE } from "@ft-transcendence/shared";
import { useSession } from "next-auth/react";

import ConfirmDialog from "./ConfirmDialog";
import styles from "./game.module.css";
import GameCanvas from "./GameCanvas";
import GameChat from "./GameChat";
import GameResultModal from "./GameResultModal";
import GameSettingsModal from "./GameSettingsModal";

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
  status: "connecting",
  winner: null,
  winningScore: GAME.DEFAULT_WINNING_SCORE,
  gameType: "online",
};

const PongGame = () => {
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
  const controllerRef = useRef<PongController | null>(null);
  const socketClientRef = useRef<PongSocketClient | null>(null);

  // WebSocket接続の初期化
  useEffect(() => {
    // セッション情報がない場合は接続しない
    if (!session?.user?.id) {
      return;
    }

    const socketClient = new PongSocketClient({
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
    socketClient.connect("/ws/game", session.user.id);

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
      controllerRef.current = new PongController(
        canvas,
        gameState,
        socketClient,
      );
      controllerRef.current.start();
    }

    // 状態を同期（毎回）
    if (playerSide) controllerRef.current.setPlayerSide(playerSide);
    controllerRef.current.updateGameState(gameState);

    // アンマウント時のクリーンアップ
    return () => {
      if (controllerRef.current) {
        controllerRef.current.stop();
        controllerRef.current = null;
      }
    };
  }, [playerSide, gameState]);

  // 背景制御ロジック
  const shouldDarkenBackground =
    gameState.status !== "playing" || showSurrenderConfirm;

  return (
    <div className={styles.container}>
      {/* 背景暗化レイヤー */}
      {shouldDarkenBackground && <div className={styles.darkBackground} />}

      <GameCanvas
        canvasRef={canvasRef}
        countdown={countdown}
        gameState={gameState}
        onSurrender={() => setShowSurrenderConfirm(true)}
      />

      <GameSettingsModal
        show={gameState.status === "setup"}
        settings={gameSettings}
        onSettingsChange={setGameSettings}
        onConfirm={() => {
          if (socketClientRef.current) {
            socketClientRef.current.sendGameSettings(gameSettings);
          }
        }}
      />

      <GameResultModal
        show={gameState.status === "finished" && gameResult !== null}
        result={gameResult}
        playerSide={playerSide}
        onBackToHome={() => {
          if (socketClientRef.current) socketClientRef.current.disconnect();
          router.push("/");
        }}
      />

      <GameChat
        show={true}
        messages={chatMessages}
        playerSide={playerSide}
        socketClient={socketClientRef.current}
      />

      <ConfirmDialog
        show={showSurrenderConfirm}
        title="ゲーム中断"
        message="中断するとあなたは不戦敗となります。ゲームを中断しますか？"
        onConfirm={() => {
          if (socketClientRef.current) {
            socketClientRef.current.sendSurrenderMessage();
            socketClientRef.current.disconnect();
            router.push("/");
          }
          setShowSurrenderConfirm(false);
        }}
        onCancel={() => setShowSurrenderConfirm(false)}
      />
    </div>
  );
};

export default PongGame;
