"use client";

import styles from "../profile.module.css";

// ダミーのユーザー統計データ
const dummyStats = {
  totalGames: 42,
  wins: 26,
  losses: 16,
  winRate: 61.9, // (wins / totalGames) * 100
  highestScore: 15,
  averageScore: 8.3,
  longestStreak: 7,
  currentStreak: 3
};

export default function StatsContainer() {
  // 実際のアプリでは、APIからデータを取得する
  const stats = dummyStats;
  
  return (
    <div className={styles.statsContainer}>
      <h2 className={styles.statsTitle}>戦績統計</h2>
      
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
          <div className={styles.statLabel}>最高スコア</div>
          <div className={styles.statValue}>{stats.highestScore}</div>
        </div>
        
        <div className={styles.statRow}>
          <div className={styles.statLabel}>平均スコア</div>
          <div className={styles.statValue}>{stats.averageScore}</div>
        </div>
      </div>
    </div>
  );
}
