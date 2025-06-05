import type { PongSocketClient } from "@/lib/game/webSocketClient";
import type { ChatMessage } from "@ft-transcendence/shared";
import { useState } from "react";

import styles from "./game.module.css";

interface GameChatProps {
  show: boolean;
  messages: ChatMessage[];
  socketClient: PongSocketClient | null;
  senderName: string;
}

const GameChat = ({
  show,
  messages,
  socketClient,
  senderName,
}: GameChatProps) => {
  const [chatInput, setChatInput] = useState("");

  if (!show) return null;

  const sendChat = () => {
    if (chatInput.trim() && socketClient) {
      const name = senderName;
      socketClient.sendChatMessage(name, chatInput);
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
