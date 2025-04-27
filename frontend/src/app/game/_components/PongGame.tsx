"use client";

import type { ChatMessage, GameState, PlayerSide } from "@/lib/pong/types";
import { useEffect, useRef, useState } from "react";
import { PongController } from "@/lib/pong/gameController";
import { PongSocketClient } from "@/lib/pong/webSocketClient";

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
    <div className="flex flex-col items-center">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="border border-gray-400"
        />

        {countdown !== null && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform text-6xl font-bold text-white">
            {countdown}
          </div>
        )}
      </div>

      <div className="mt-4 w-full max-w-2xl rounded border border-gray-300 p-4">
        <div
          className="mb-4 h-40 overflow-y-auto rounded bg-gray-100 p-2"
          style={{ scrollBehavior: "smooth" }}
        >
          {chatMessages.map((chat, index) => (
            <div key={index} className="mb-2">
              <span className="font-bold">{chat.name}:</span>
              <span className="ml-2">{chat.message}</span>
            </div>
          ))}
        </div>

        <div className="flex">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendChat()}
            className="flex-1 rounded-l border border-gray-300 px-3 py-2"
            placeholder="メッセージを入力..."
          />
          <button
            onClick={sendChat}
            type="button"
            className="rounded-r bg-blue-500 px-4 py-2 text-white"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
};

export default PongGame;
