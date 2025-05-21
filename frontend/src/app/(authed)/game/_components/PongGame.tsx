"use client";

import type { ChatMessage, GameState, PlayerSide, GameSettings } from "src/types/game";
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
  
  // ゲーム設定関連の状態
  const [showSettings, setShowSettings] = useState(false);
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    ballSpeed: 3, // 初期値は3
    winningScore: 10 // 初期値は10
  });
  const [settingsConfirmed, setSettingsConfirmed] = useState(false);

  const router = useRouter();
  const controllerRef = useRef<PongController | null>(null);
  const socketClientRef = useRef<PongSocketClient | null>(null);

  useEffect(() => {
    const wsUrl = "/api/ws-proxy";

    const socketClient = new PongSocketClient({
      onInit: (side, state) => {
        setPlayerSide(side);
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
    setGameSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  // 設定確定ハンドラ
  const confirmSettings = () => {
    // あとでバックエンド側の実装と連携する予定
    // 現状は単に設定ダイアログを閉じるだけ
    setSettingsConfirmed(true);
    setShowSettings(false);
    
    // 実際のwebsocket通信はここで行う予定
    if (socketClientRef.current) {
      socketClientRef.current.sendGameSettings(gameSettings);
    }
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
        
        {/* ゲーム設定モーダル */}
        {showSettings && !settingsConfirmed && (
          <div className={styles.settingsOverlay}>
            <div className={styles.settingsModal}>
              <h2 className={styles.settingsTitle}>ゲーム内容を設定してください。</h2>
              
              <div className={styles.settingItem}>
                <label htmlFor="ballSpeed" className={styles.settingLabel}>スピード:</label>
                <select 
                  id="ballSpeed"
                  value={gameSettings.ballSpeed}
                  onChange={(e) => handleSettingChange('ballSpeed', parseInt(e.target.value))}
                  className={styles.settingSelect}
                >
                  {Array.from({length: 10}, (_, i) => i + 1).map(value => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
              
              <div className={styles.settingItem}>
                <label htmlFor="winningScore" className={styles.settingLabel}>勝利得点:</label>
                <select 
                  id="winningScore"
                  value={gameSettings.winningScore}
                  onChange={(e) => handleSettingChange('winningScore', parseInt(e.target.value))}
                  className={styles.settingSelect}
                >
                  {[5, 10, 15, 20].map(value => (
                    <option key={value} value={value}>{value}</option>
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
