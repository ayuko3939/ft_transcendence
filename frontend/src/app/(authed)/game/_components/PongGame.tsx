"use client";

import type {
  ChatMessage,
  GameResult,
  GameSettings,
  GameState,
  PlayerSide,
} from "../../../../types/shared/types";
import { CANVAS, BALL, PADDLE, GAME } from "../../../../types/shared/constants";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PongController } from "@/lib/game/gameController";
import { PongSocketClient } from "@/lib/game/webSocketClient";

import styles from "./game.module.css";

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
  score: {
    left: 0,
    right: 0,
  },
  status: 'waiting',
  winner: null,
  winningScore: GAME.DEFAULT_WINNING_SCORE,
};

const PongGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerSide, setPlayerSide] = useState<PlayerSide>(null);
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);

  // ゲーム設定関連の状態
  const [showSettings, setShowSettings] = useState(false);
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    ballSpeed: BALL.DEFAULT_SPEED,
    winningScore: GAME.DEFAULT_WINNING_SCORE,
  });
  const [settingsConfirmed, setSettingsConfirmed] = useState(false);

  // ゲーム結果表示用の状態
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);

  // playerSideを保持するRef（GameOver時にnullにならないよう）
  const playerSideRef = useRef<PlayerSide>(null);

  const router = useRouter();
  const controllerRef = useRef<PongController | null>(null);
  const socketClientRef = useRef<PongSocketClient | null>(null);

  useEffect(() => {
    const wsUrl = "/api/ws-proxy";

    const socketClient = new PongSocketClient({
      onInit: (side, state) => {
        setPlayerSide(side);
        playerSideRef.current = side; // Refにも保存
        setGameState(state);
        // 左側プレイヤーの場合は設定画面を表示
        if (side === "left") {
          setShowSettings(true);
        }
        if (controllerRef.current) {
          controllerRef.current.setPlayerSide(side);
          controllerRef.current.updateGameState(state);
        }
      },
      onGameState: (state) => {
        setGameState(state);
        if (controllerRef.current) {
          controllerRef.current.updateGameState(state);
        }
      },
      onChatMessages: (messages) => {
        setChatMessages(messages);
      },
      onCountdown: (count) => {
        setCountdown(count);
      },
      onGameStart: (state) => {
        setCountdown(null);
        setGameState(state);
        if (controllerRef.current) {
          controllerRef.current.updateGameState(state);
        }
      },
      onGameOver: (result) => {
        setIsGameOver(true);
        setGameResult(result);
        
        // ゲーム状態も手動で'finished'に更新
        setGameState(prevState => ({
          ...prevState,
          status: 'finished',
          winner: result.winner
        }));
        
        // ゲームコントローラーを停止
        if (controllerRef.current) {
          controllerRef.current.stop();
        }
      },
    });

    socketClientRef.current = socketClient;
    socketClient.connect(wsUrl);

    return () => {
      socketClient.disconnect();
    };
  }, []);

  // Canvasとゲームコントローラーの初期化
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !socketClientRef.current) return;

    const controller = new PongController(
      canvas,
      gameState,
      socketClientRef.current,
    );

    controllerRef.current = controller;
    controller.start();

    if (playerSide) {
      controller.setPlayerSide(playerSide);
    }

    return () => {
      controller.stop();
    };
  }, [canvasRef.current, socketClientRef.current]);

  // チャット送信ハンドラ
  const sendChat = () => {
    if (chatInput.trim() && playerSide && socketClientRef.current) {
      socketClientRef.current.sendChatMessage(
        playerSide === "left" ? "プレイヤー1" : "プレイヤー2",
        chatInput,
      );
      setChatInput("");
    }
  };

  // ゲーム中断ハンドラ
  const handleSurrender = () => {
    setShowSurrenderConfirm(true);
  };

  // 中断確認ダイアログでの「はい」クリック時
  const confirmSurrender = () => {
    if (socketClientRef.current) {
      socketClientRef.current.sendSurrenderMessage();
      socketClientRef.current.disconnect();
      router.push("/");
    }
    setShowSurrenderConfirm(false);
  };

  // 中断確認ダイアログでの「いいえ」クリック時
  const cancelSurrender = () => {
    setShowSurrenderConfirm(false);
  };

  // 設定変更ハンドラ
  const handleSettingChange = (setting: keyof GameSettings, value: number) => {
    setGameSettings((prev) => ({
      ...prev,
      [setting]: value,
    }));
  };

  // 設定確定ハンドラ
  const confirmSettings = () => {
    setSettingsConfirmed(true);
    setShowSettings(false);

    if (socketClientRef.current) {
      socketClientRef.current.sendGameSettings(gameSettings);
    }
  };

  // ホーム画面に戻るハンドラ
  const handleBackToHome = () => {
    if (socketClientRef.current) {
      socketClientRef.current.disconnect();
    }
    router.push("/");
  };

  // ゲーム状態に基づく表示判定
  const isWaiting = gameState.status === 'waiting';
  const isCountdown = gameState.status === 'countdown';
  const isPlaying = gameState.status === 'playing';
  const isFinished = gameState.status === 'finished';

  // WIN/LOSE判定
  const getResultText = () => {
    if (!gameResult) return "";
    const currentPlayerSide = playerSideRef.current || playerSide;
    const isWinner = currentPlayerSide === gameResult.winner;
    return isWinner ? "WIN" : "LOSE";
  };

  return (
    <div className={styles.container}>
      {/* 中断ボタン - ゲーム終了時は非表示 */}
      {!isFinished && !isGameOver && (
        <div className={styles.surrenderButtonContainer}>
          <button onClick={handleSurrender} className={styles.surrenderButton}>
            中断
          </button>
        </div>
      )}

      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={CANVAS.WIDTH}
          height={CANVAS.HEIGHT}
          className={styles.canvas}
        />

        {countdown !== null && !isFinished && !isGameOver && (
          <div className={styles.countdownOverlay}>
            <div className={styles.countdownText}>{countdown}</div>
          </div>
        )}

        {/* ゲーム結果画面 */}
        {(isFinished || isGameOver) && gameResult && (
          <div className={styles.gameOverOverlay}>
            <div className={styles.gameOverContent}>
              <h2 className={styles.resultTitle}>
                {getResultText()}
              </h2>
              <div className={styles.finalScore}>
                <span>{gameResult.finalScore.left}</span>
                <span className={styles.scoreSeparator}>-</span>
                <span>{gameResult.finalScore.right}</span>
              </div>
              {gameResult.message && (
                <p className={styles.resultMessage}>{gameResult.message}</p>
              )}
              <button onClick={handleBackToHome} className={styles.backButton}>
                戻る
              </button>
            </div>
          </div>
        )}

        {/* ゲーム設定モーダル */}
        {showSettings && !settingsConfirmed && (
          <div className={styles.settingsOverlay}>
            <div className={styles.settingsModal}>
              <h2 className={styles.settingsTitle}>
                ゲーム内容を設定してください。
              </h2>

              <div className={styles.settingItem}>
                <label htmlFor="ballSpeed" className={styles.settingLabel}>
                  スピード:
                </label>
                <select
                  id="ballSpeed"
                  value={gameSettings.ballSpeed}
                  onChange={(e) =>
                    handleSettingChange("ballSpeed", parseInt(e.target.value))
                  }
                  className={styles.settingSelect}
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.settingItem}>
                <label htmlFor="winningScore" className={styles.settingLabel}>
                  勝利得点:
                </label>
                <select
                  id="winningScore"
                  value={gameSettings.winningScore}
                  onChange={(e) =>
                    handleSettingChange(
                      "winningScore",
                      parseInt(e.target.value),
                    )
                  }
                  className={styles.settingSelect}
                >
                  {GAME.WINNING_SCORE_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={confirmSettings}
                className={styles.settingsButton}
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 中断確認ダイアログ */}
      {showSurrenderConfirm && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <p className={styles.dialogText}>
              中断するとあなたは不戦敗となります。ゲームを中断しますか？
            </p>
            <div className={styles.dialogButtons}>
              <button
                onClick={confirmSurrender}
                className={`${styles.dialogButton} ${styles.confirmButton}`}
              >
                はい
              </button>
              <button
                onClick={cancelSurrender}
                className={`${styles.dialogButton} ${styles.cancelButton}`}
              >
                いいえ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* チャット部分 - ゲーム終了時は非表示 */}
      {!isFinished && !isGameOver && (
        <div className={styles.chatContainer}>
          <div className={styles.chatMessages}>
            {chatMessages.map((chat, index) => (
              <div key={index} className="mb-2">
                <span className="font-bold">{chat.name}:</span>
                <span className="ml-2">{chat.message}</span>
              </div>
            ))}
          </div>

          <div className={styles.chatInputContainer}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                // チャット入力中のwキーとsキーのイベント伝播を停止
                if (
                  e.key === "w" ||
                  e.key === "W" ||
                  e.key === "s" ||
                  e.key === "S"
                ) {
                  e.stopPropagation();
                }
                // Enterキーが押されたらチャット送信
                if (e.key === "Enter") {
                  sendChat();
                }
              }}
              className={styles.chatInput}
              placeholder="メッセージを入力..."
            />
            <button
              onClick={sendChat}
              type="button"
              className={styles.sendButton}
            >
              送信
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PongGame;
