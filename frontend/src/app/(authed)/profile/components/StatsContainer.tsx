"use client";

import { useEffect, useState } from "react";

import styles from "../profile.module.css";

interface UserStats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  longestStreak: number;
}

export default function StatsContainer() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch("/api/profile/stats");

      if (!response.ok) {
        throw new Error("統計情報の取得に失敗しました");
      }

      const data: UserStats = await response.json();
      setStats(data);
    } catch (error) {
      console.error("統計情報取得エラー:", error);
      setError("統計情報の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.statsContainer}>
        <h2 className={styles.statsTitle}>統計</h2>
        <div style={{ color: "white", textAlign: "center", padding: "2rem" }}>
          読み込み中...
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className={styles.statsContainer}>
        <h2 className={styles.statsTitle}>統計</h2>
        <div style={{ color: "red", textAlign: "center", padding: "2rem" }}>
          {error || "統計情報を取得できませんでした"}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.statsContainer}>
      <h2 className={styles.statsTitle}>統計</h2>

      <div className={styles.statsTable}>
        <div className={styles.statRow}>
          <div className={styles.statLabel}>総試合数</div>
          <div className={styles.statValue}>{stats.totalGames}</div>
        </div>

        <div className={styles.statRow}>
          <div className={styles.statLabel}>勝利数</div>
          <div className={styles.statValue}>{stats.wins}</div>
        </div>

        <div className={styles.statRow}>
          <div className={styles.statLabel}>敗北数</div>
          <div className={styles.statValue}>{stats.losses}</div>
        </div>

        <div className={styles.statRow}>
          <div className={styles.statLabel}>勝率</div>
          <div className={styles.statValue}>{stats.winRate}%</div>
        </div>

        <div className={styles.statRow}>
          <div className={styles.statLabel}>現在の連勝</div>
          <div className={styles.statValue}>{stats.currentStreak}</div>
        </div>

        <div className={styles.statRow}>
          <div className={styles.statLabel}>最長連勝</div>
          <div className={styles.statValue}>{stats.longestStreak}</div>
        </div>
      </div>
    </div>
  );
}
