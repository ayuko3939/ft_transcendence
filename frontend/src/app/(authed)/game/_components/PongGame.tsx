"use client";

import type { ChatMessage, GameState, PlayerSide } from "@/lib/pong/types";
import { useEffect, useRef, useState } from "react";
import { PongController } from "@/lib/pong/gameController";
import { PongSocketClient } from "@/lib/pong/webSocketClient";

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

  const controllerRef = useRef<PongController | null>(null);
  const socketClientRef = useRef<PongSocketClient | null>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/game";

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

  return (
    <div className={styles.container}>
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
            onKeyDown={(e) => e.key === "Enter" && sendChat()}
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
