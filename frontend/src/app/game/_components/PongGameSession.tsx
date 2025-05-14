"use client";

import type { ChatMessage, GameState, PlayerSide } from "src/types/game";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PongController } from "@/lib/game/gameController";

import styles from "./game.module.css";

interface PongGameSessionProps {
  gameId: string;
  action: "join" | "spectate";
  userId: string;
  username: string;
}

export default function PongGameSession({
  gameId,
  action,
  userId,
  username,
}: PongGameSessionProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerSide, setPlayerSide] = useState<PlayerSide>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameStatus, setGameStatus] = useState<string>("connecting");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gameInfo, setGameInfo] = useState<any>(null);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const controllerRef = useRef<PongController | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // WebSocket接続を確立
  useEffect(() => {
    if (!userId || !username) return;

    // WebSocketの接続
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(
      `${protocol}//${window.location.host}/api/ws-proxy/game/${gameId}?userId=${userId}&username=${username}&action=${action}`
    );

    socketRef.current = socket;

    socket.onopen = () => {
      console.log("ゲームWebSocket接続が確立されました");
      setGameStatus("waiting");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleSocketMessage(data);
      } catch (error) {
        console.error("WebSocketメッセージの解析エラー:", error);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket接続エラー:", error);
      setError("ゲームサーバーとの接続に失敗しました");
      setGameStatus("error");
    };

    socket.onclose = () => {
      console.log("ゲームWebSocket接続が閉じられました");
      if (gameStatus !== "finished" && gameStatus !== "error") {
        setError("ゲームサーバーとの接続が切断されました");
        setGameStatus("error");
      }
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [gameId, userId, username, action]);

  // ゲームコントローラの初期化
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState) return;

    const controller = new PongController(canvas, gameState, {
      sendPaddleMove: (y) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: "paddleMove",
            y,
          }));
        }
      }
    });

    controllerRef.current = controller;
    controller.start();

    if (playerSide) {
      controller.setPlayerSide(playerSide);
    } else {
      controller.setPlayerSide("spectator");
    }

    return () => {
      controller.stop();
    };
  }, [canvasRef.current, gameState, playerSide]);

  // WebSocketメッセージの処理
  const handleSocketMessage = (data: any) => {
    console.log("Received message:", data);
    
    switch (data.type) {
      case "init":
        // 初期化メッセージ
        setGameInfo({
          id: data.gameId,
          name: data.gameName,
          status: data.status,
        });
        setPlayerSide(data.side || "spectator");
        setGameState(data.gameState);
        break;
        
      case "gameInfo":
        // ゲーム情報
        setGameInfo({
          id: data.id,
          name: data.name,
          status: data.status,
          players: data.players,
        });
        setSpectatorCount(data.spectatorCount);
        setGameState(data.gameState);
        break;
        
      case "gameState":
        // ゲーム状態の更新
        setGameState(data);
        if (controllerRef.current) {
          controllerRef.current.updateGameState(data);
        }
        break;
        
      case "chat":
        // 単一のチャットメッセージ
        setChatMessages(prev => [...prev, data.chat]);
        break;
        
      case "chatHistory":
        // チャット履歴
        setChatMessages(data.chats);
        break;
        
      case "countdown":
        // カウントダウン
        setCountdown(data.count);
        setGameStatus("countdown");
        break;
        
      case "gameStart":
        // ゲーム開始
        setCountdown(null);
        setGameStatus("playing");
        if (data.gameState) {
          setGameState(data.gameState);
        }
        break;
        
      case "gameEnd":
        // ゲーム終了
        setGameStatus("finished");
        break;
        
      case "playerDisconnected":
        // プレイヤー切断
        setGameStatus("abandoned");
        setError(`${data.side === "left" ? "左" : "右"}のプレイヤーが切断しました`);
        break;
        
      case "spectatorCount":
        // 観戦者数の更新
        setSpectatorCount(data.count);
        break;
        
      case "error":
        // エラーメッセージ
        setError(data.message);
        break;
    }
  };

  // チャット送信ハンドラ
  const sendChat = () => {
    if (chatInput.trim() && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "chat",
        message: chatInput,
      }));
      setChatInput("");
    }
  };

  // ゲーム一覧に戻るハンドラ
  const handleBackToGames = () => {
    router.push("/games");
  };

  // エラー時の表示
  if (error && (gameStatus === "error" || gameStatus === "abandoned")) {
    return (
      <div className="cyber-container glow-animation max-w-md p-6 text-center">
        <h2 className="cyber-title mb-4">エラー</h2>
        <p className="mb-4 text-red-500">{error}</p>
        <button onClick={handleBackToGames} className="cyber-button">
          ゲーム一覧に戻る
        </button>
      </div>
    );
  }

  // 接続中または読み込み中の表示
  if (gameStatus === "connecting" || !gameState) {
    return (
      <div className="cyber-container glow-animation max-w-md p-6 text-center">
        <h2 className="cyber-title mb-4">接続中...</h2>
        <p className="text-white">ゲームサーバーに接続しています</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {gameInfo && (
        <div className="mb-4 text-center">
          <h2 className="cyber-title">{gameInfo.name}</h2>
          <p className="text-cyan-400">
            {gameStatus === "waiting"
              ? "プレイヤー待機中"
              : gameStatus === "countdown"
              ? "ゲーム開始まであと"
              : gameStatus === "playing"
              ? "プレイ中"
              : gameStatus === "finished"
              ? "ゲーム終了"
              : ""}
          </p>
          {playerSide === "spectator" ? (
            <p className="text-white">あなたは観戦者です (他に{spectatorCount - 1}人が観戦中)</p>
          ) : (
            <p className="text-white">あなたは{playerSide === "left" ? "左" : "右"}のプレイヤーです</p>
          )}
        </div>
      )}

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

      <div className="mt-4 flex justify-center">
        <button onClick={handleBackToGames} className="cyber-button">
          ゲーム一覧に戻る
        </button>
      </div>

      <div className={styles.chatContainer}>
        <h3 className="mb-2 text-center text-cyan-400">チャット</h3>
        <div className={styles.chatMessages}>
          {chatMessages.length > 0 ? (
            chatMessages.map((chat, index) => (
              <div key={index} className="mb-2">
                <span className="font-bold">{chat.username || chat.name}:</span>
                <span className="ml-2">{chat.message}</span>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-400">メッセージはまだありません</p>
          )}
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
}
