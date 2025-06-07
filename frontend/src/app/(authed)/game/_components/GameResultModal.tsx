import type { GameResult, PlayerSide, GameType } from "@ft-transcendence/shared";
import { useState } from "react";

import styles from "./game.module.css";

interface GameResultModalProps {
  show: boolean;
  result: GameResult | null;
  playerSide: PlayerSide;
  opponentUserId?: string;
  gameType?: GameType;
  onBackToHome: () => void;
}

const GameResultModal = ({
  show,
  result,
  playerSide,
  opponentUserId,
  gameType,
  onBackToHome,
}: GameResultModalProps) => {
  const [friendButtonState, setFriendButtonState] = useState<
    "default" | "loading" | "added" | "already" | "error"
  >("default");

  if (!show || !result) return null;

  const getResultText = () => {
    if (!playerSide) return "";
    return playerSide === result.winner ? "WIN" : "LOSE";
  };

  const handleAddFriend = async () => {
    if (!opponentUserId) return;

    setFriendButtonState("loading");

    try {
      const response = await fetch("/api/friends", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ friendId: opponentUserId }),
      });

      if (response.ok) {
        setFriendButtonState("added");
      } else if (response.status === 400) {
        // 既に友達または自分自身を追加しようとした場合
        const errorData = await response.json();
        if (errorData.error?.includes("既に友達")) {
          setFriendButtonState("already");
        } else {
          setFriendButtonState("error");
        }
      } else {
        setFriendButtonState("error");
      }
    } catch (error) {
      console.error("友達追加エラー:", error);
      setFriendButtonState("error");
    }
  };

  const getFriendButtonText = () => {
    switch (friendButtonState) {
      case "loading":
        return "追加中...";
      case "added":
        return "友達に追加しました";
      case "already":
        return "既に友達です";
      case "error":
        return "追加に失敗しました";
      default:
        return "友達に追加";
    }
  };

  const shouldShowFriendButton = () => {
    return gameType !== "local" && opponentUserId;
  };

  const isFriendButtonDisabled = () => {
    return friendButtonState === "loading" || 
           friendButtonState === "added" || 
           friendButtonState === "already";
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.gameOverContent}>
        <h2 className={styles.resultTitle}>{getResultText()}</h2>

        <div className={styles.finalScore}>
          <span>{result.finalScore.left}</span>
          <span className={styles.scoreSeparator}>-</span>
          <span>{result.finalScore.right}</span>
        </div>

        {result.message && (
          <p className={styles.resultMessage}>{result.message}</p>
        )}

        {/* 友達追加ボタン */}
        {shouldShowFriendButton() && (
          <button
            onClick={handleAddFriend}
            disabled={isFriendButtonDisabled()}
            className={`${styles.backButton} ${
              friendButtonState === "added" || friendButtonState === "already"
                ? "opacity-75"
                : ""
            } mb-4`}
            style={{
              backgroundColor: friendButtonState === "added" 
                ? "rgba(74, 222, 128, 0.8)" 
                : friendButtonState === "already"
                ? "rgba(156, 163, 175, 0.8)"
                : friendButtonState === "error"
                ? "rgba(239, 68, 68, 0.8)"
                : undefined
            }}
          >
            {getFriendButtonText()}
          </button>
        )}

        <button onClick={onBackToHome} className={styles.backButton}>
          戻る
        </button>
      </div>
    </div>
  );
};

export default GameResultModal;
