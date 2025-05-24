import { useState } from "react";
import type { ChatMessage, PlayerSide } from "../../../../types/shared/types";
import type { PongSocketClient } from "@/lib/game/webSocketClient";
import styles from "./game.module.css";

interface GameChatProps {
  show: boolean;
  messages: ChatMessage[];
  playerSide: PlayerSide;
  socketClient: PongSocketClient | null;
}

const GameChat = ({ show, messages, playerSide, socketClient }: GameChatProps) => {
  const [chatInput, setChatInput] = useState("");

  if (!show) return null;

  const sendChat = () => {
    if (chatInput.trim() && playerSide && socketClient) {
      socketClient.sendChatMessage(
        playerSide === "left" ? "プレイヤー1" : "プレイヤー2",
        chatInput,
      );
      setChatInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // チャット入力中のw/sキーのイベント伝播を停止
    if (e.key === "w" || e.key === "W" || e.key === "s" || e.key === "S") {
      e.stopPropagation();
    }
    if (e.key === "Enter") {
      sendChat();
    }
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatMessages}>
        {messages.map((chat, index) => (
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
          onKeyDown={handleKeyDown}
          className={styles.chatInput}
          placeholder="メッセージを入力..."
        />
        <button onClick={sendChat} type="button" className={styles.sendButton}>
          送信
        </button>
      </div>
    </div>
  );
};

export default GameChat;
