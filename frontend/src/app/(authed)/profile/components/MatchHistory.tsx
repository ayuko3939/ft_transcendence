"use client";

import { useState } from "react";
import styles from "../profile.module.css";

// ダミーの試合履歴データ
const generateDummyMatches = (count: number) => {
  const opponents = [
    "TechMaster92", "CyberNinja", "QuantumPlayer", "NeonStriker", 
    "PixelWarrior", "DigitalPhoenix", "SynthWave", "BinaryBaron",
    "VirtualVoyager", "CodeBreaker"
  ];
  
  const getRandomDate = () => {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(now.setDate(now.getDate() - daysAgo));
    return date.toISOString().split('T')[0];
  };
  
  return Array.from({ length: count }, (_, i) => {
    const isWin = Math.random() > 0.4;
    const playerScore = isWin ? 10 + Math.floor(Math.random() * 5) : 5 + Math.floor(Math.random() * 5);
    const opponentScore = isWin ? Math.floor(Math.random() * 5) : playerScore + 1 + Math.floor(Math.random() * 5);
    
    return {
      id: i + 1,
      opponent: opponents[Math.floor(Math.random() * opponents.length)],
      date: getRandomDate(),
      playerScore,
      opponentScore,
      result: isWin ? "win" : "lose"
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // 日付で降順ソート
};

export default function MatchHistory() {
  const [matches, setMatches] = useState(generateDummyMatches(10));
  const [isLoading, setIsLoading] = useState(false);
  
  const loadMoreMatches = () => {
    setIsLoading(true);
    
    // 無限スクロールのシミュレーション - 実際はAPIからデータを取得する
    setTimeout(() => {
      const newMatches = generateDummyMatches(5);
      setMatches([...matches, ...newMatches]);
      setIsLoading(false);
    }, 1000);
  };
  
  return (
    <div className={styles.matchHistoryContainer}>
      <h2 className={styles.historyTitle}>対戦履歴</h2>
      
      <div className={styles.matchList}>
        {matches.map((match) => (
          <div key={match.id} className={styles.matchItem}>
            <div className={styles.matchInfo}>
              <div className={styles.matchOpponent}>vs {match.opponent}</div>
              <div className={styles.matchDate}>{match.date}</div>
            </div>
            
            <div className={`${styles.matchScore} ${match.result === "win" ? styles.winScore : styles.loseScore}`}>
              {match.playerScore} - {match.opponentScore}
            </div>
            
            <div className={`${styles.matchResult} ${styles[match.result]}`}>
              {match.result === "win" ? "勝利" : "敗北"}
            </div>
          </div>
        ))}
      </div>
      
      <button 
        className={styles.loadMoreButton}
        onClick={loadMoreMatches}
        disabled={isLoading}
      >
        {isLoading ? "読み込み中..." : "もっと見る"}
      </button>
    </div>
  );
}
