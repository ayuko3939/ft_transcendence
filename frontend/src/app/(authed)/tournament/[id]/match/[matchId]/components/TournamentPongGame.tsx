"use client";

import type {
  ChatMessage,
  GameResult,
  GameState,
  PlayerSide,
} from "@ft-transcendence/shared";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/(authed)/game/_components/ConfirmDialog";
import styles from "@/(authed)/game/_components/game.module.css";
import GameCanvas from "@/(authed)/game/_components/GameCanvas";
import GameChat from "@/(authed)/game/_components/GameChat";
import GameResultModal from "@/(authed)/game/_components/GameResultModal";
import { PongController } from "@/lib/game/gameController";
import { PongSocketClient } from "@/lib/game/webSocketClient";
import { BALL, CANVAS, GAME, PADDLE } from "@ft-transcendence/shared";
import { useSession } from "next-auth/react";

interface TournamentMatchInfo {
  id: string;
  tournamentId: string;
  round: number;
  matchNumber: number;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  status: "pending" | "in_progress" | "completed";
}

interface TournamentPongGameProps {
  matchInfo: TournamentMatchInfo;
  onGameReady: () => void;
}

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
  gameType: "tournament",
};

const TournamentPongGame = ({
  matchInfo,
  onGameReady,
}: TournamentPongGameProps) => {
  // セッション情報を取得
  const { data: session } = useSession();

  // 基本状態
  const [playerSide, setPlayerSide] = useState<PlayerSide>(null);
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // UI状態
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);

  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<PongController | null>(null);
  const socketClientRef = useRef<PongSocketClient | null>(null);

  // WebSocket接続の初期化
  useEffect(() => {
    // セッション情報がない場合は接続しない
    if (!session?.user?.id || !matchInfo.id) {
      return;
    }

    const socketClient = new PongSocketClient({
      onInit: (side, state) => {
        console.log("[Tournament] onInit called:", { side, state });
        setPlayerSide(side);
        setGameState(state);
        onGameReady();
      },
      onGameState: (state) => {
        console.log("[Tournament] onGameState:", state);
        setGameState(state);
      },
      onChatMessages: setChatMessages,
      onCountdown: (count) => {
        console.log("[Tournament] onCountdown:", count);
        setCountdown(count);
        setGameState((prev) => ({ ...prev, status: "countdown" }));
      },
      onGameStart: (state) => {
        console.log("[Tournament] onGameStart:", state);
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
        console.log("[Tournament] onWaitingForPlayer");
        setGameState((prev) => ({ ...prev, status: "waiting" }));
      },
    });

    socketClientRef.current = socketClient;
    // トーナメント専用のWebSocketエンドポイントを使用（matchIdを使用）
    const wsUrl = `/ws/tournament-match/${matchInfo.id}`;
    console.log(
      "[Tournament] Connecting to WebSocket:",
      wsUrl,
      "with userId:",
      session.user.id,
    );
    socketClient.connect(wsUrl, session.user.id);

    return () => {
      socketClient.disconnect();
    };
  }, [session?.user?.id, matchInfo.id, onGameReady]);

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

  const handleBackToTournament = () => {
    if (socketClientRef.current) socketClientRef.current.disconnect();
    router.push(`/tournament/${matchInfo.tournamentId}`);
  };

  return (
    <div className={styles.container}>
      {/* 背景暗化レイヤー */}
      {shouldDarkenBackground && <div className={styles.darkBackground} />}

      {/* トーナメント情報表示 */}
      <div className="mb-4 text-center text-white">
        <h2 className="text-xl font-bold text-cyan-400">
          ラウンド {matchInfo.round} - 試合 {matchInfo.matchNumber}
        </h2>
        <p className="text-sm">
          {matchInfo.player1Name} vs {matchInfo.player2Name}
        </p>
      </div>

      <GameCanvas
        canvasRef={canvasRef}
        countdown={countdown}
        gameState={gameState}
        onSurrender={() => setShowSurrenderConfirm(true)}
      />

      <GameResultModal
        show={gameState.status === "finished" && gameResult !== null}
        result={gameResult}
        playerSide={playerSide}
        onBackToHome={handleBackToTournament}
      />

      <GameChat
        show={true}
        messages={chatMessages}
        socketClient={socketClientRef.current}
        senderName={session?.user?.name || "undefined"}
      />

      <ConfirmDialog
        show={showSurrenderConfirm}
        title="試合中断"
        message="中断するとあなたは不戦敗となります。試合を中断しますか？"
        onConfirm={() => {
          if (socketClientRef.current) {
            socketClientRef.current.sendSurrenderMessage();
            socketClientRef.current.disconnect();
            handleBackToTournament();
          }
          setShowSurrenderConfirm(false);
        }}
        onCancel={() => setShowSurrenderConfirm(false)}
      />
    </div>
  );
};

export default TournamentPongGame;
