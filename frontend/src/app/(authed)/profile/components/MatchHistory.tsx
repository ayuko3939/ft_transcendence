"use client";

import { useEffect, useState } from "react";

import styles from "../profile.module.css";

interface Match {
  id: string;
  date: string;
  opponent: string;
  playerScore: number;
  opponentScore: number;
  result: "win" | "lose";
  gameSettings?: {
    ballSpeed: number;
    winningScore: number;
  };
  endReason?: string;
}

interface MatchHistoryResponse {
  matches: Match[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export default function MatchHistory() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // 初回ロード
  useEffect(() => {
    loadMatches(0);
  }, []);

  const loadMatches = async (pageNumber: number) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/profile/match-history?page=${pageNumber}&limit=10`,
      );

      if (!response.ok) {
        throw new Error("対戦履歴の取得に失敗しました");
      }

      const data: MatchHistoryResponse = await response.json();

      if (pageNumber === 0) {
        // 初回ロードの場合は置き換え
        setMatches(data.matches);
      } else {
        // 追加ロードの場合は追加
        setMatches((prev) => [...prev, ...data.matches]);
      }

      setPage(pageNumber);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("対戦履歴取得エラー:", error);
      setError("対戦履歴の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreMatches = () => {
    if (hasMore && !isLoading) {
      loadMatches(page + 1);
    }
  };

  if (error) {
    return (
      <div className={styles.matchHistoryContainer}>
        <h2 className={styles.historyTitle}>対戦履歴</h2>
        <div style={{ color: "red", textAlign: "center", padding: "2rem" }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.matchHistoryContainer}>
      <h2 className={styles.historyTitle}>対戦履歴</h2>

      {matches.length === 0 && !isLoading ? (
        <div style={{ color: "white", textAlign: "center", padding: "2rem" }}>
          まだ対戦履歴がありません
        </div>
      ) : (
        <div className={styles.matchList}>
          {matches.map((match) => (
            <div key={match.id} className={styles.matchItem}>
              <div className={styles.matchInfo}>
                <div className={styles.matchOpponent}>vs {match.opponent}</div>
                <div className={styles.matchDate}>{match.date}</div>
                {match.endReason && (
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "rgba(255, 255, 255, 0.5)",
                    }}
                  >
                    {match.endReason === "surrender" && "降参"}
                    {match.endReason === "disconnect" && "切断"}
                    {match.endReason === "completed" && "完了"}
                  </div>
                )}
              </div>

              <div
                className={`${styles.matchScore} ${
                  match.result === "win" ? styles.winScore : styles.loseScore
                }`}
              >
                <span>{match.playerScore}</span>
                <span style={{ margin: "0 5px" }}>-</span>
                <span>{match.opponentScore}</span>
              </div>

              <div className={`${styles.matchResult} ${styles[match.result]}`}>
                {match.result === "win" ? "勝利" : "敗北"}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <button
          className={styles.loadMoreButton}
          onClick={loadMoreMatches}
          disabled={isLoading}
        >
          {isLoading ? "読み込み中..." : "もっと見る"}
        </button>
      )}
    </div>
  );
}
