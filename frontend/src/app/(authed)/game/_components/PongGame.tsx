"use client";

import type { ChatMessage, GameState, PlayerSide } from "src/types/game";
import { useEffect, useRef, useState } from "react";
import { PongController } from "@/lib/game/gameController";
import { PongSocketClient } from "@/lib/game/webSocketClient";
import { useRouter } from "next/navigation";

import styles from "./game.module.css";

const initialGameState: GameState = {
  ball: {
    x: 400,
    y: 300,
    dx: 5,
    dy: 5,
    radius: 10,
  },
  paddleLeft: {
    x: 50,
    y: 250,
    width: 10,
    height: 100,
  },
  paddleRight: {
    x: 740,
    y: 250,
    width: 10,
    height: 100,
  },
  score: {
    left: 0,
    right: 0,
  },
};

const PongGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerSide, setPlayerSide] = useState<PlayerSide>(null);
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  // 中断確認ダイアログの表示状態
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
  
  const router = useRouter();
  const controllerRef = useRef<PongController | null>(null);
  const socketClientRef = useRef<PongSocketClient | null>(null);

  useEffect(() => {
    const wsUrl = "/api/ws-proxy";

    const socketClient = new PongSocketClient({
      onInit: (side, state) => {
        setPlayerSide(side);
        setGameState(state);
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
      // 追加した sendSurrenderMessage メソッドを使用
      socketClientRef.current.sendSurrenderMessage();
      socketClientRef.current.disconnect();
      // ホーム画面に戻る
      router.push("/");
    }
    setShowSurrenderConfirm(false);
  };

  // 中断確認ダイアログでの「いいえ」クリック時
  const cancelSurrender = () => {
    setShowSurrenderConfirm(false);
  };

  return (
    <div className={styles.container}>
      {/* 中断ボタン */}
      <div className={styles.surrenderButtonContainer}>
        <button
          onClick={handleSurrender}
          className={styles.surrenderButton}
        >
          中断
        </button>
      </div>

      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className={styles.canvas}
        />

        {countdown !== null && (
          <div className={styles.countdownOverlay}>
            <div className={styles.countdownText}>{countdown}</div>
          </div>
        )}
      </div>

      {/* 中断確認ダイアログ */}
      {showSurrenderConfirm && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <p className={styles.dialogText}>
              中断するとあなたは不戦敗となります。\nゲームを中断しますか？
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
              if (e.key === 'w' || e.key === 'W' || e.key === 's' || e.key === 'S') {
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
    </div>
  );
};

export default PongGame;
