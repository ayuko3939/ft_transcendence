"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { logButtonClick } from "@/lib/clientLogger";

import AvatorCard from "./components/AvatorContainer";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const router = useRouter();
  const { status, data: session } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const handleOnlineGame = () => {
    const userId = session?.user?.id;
    logButtonClick("オンライン対戦", userId);
    router.push("/game");
  };

  const handleLocalGame = () => {
    const userId = session?.user?.id;
    logButtonClick("ローカル対戦", userId);
    router.push("/local-game");
  };

  const handleTournament = () => {
    const userId = session?.user?.id;
    logButtonClick("トーナメント", userId);
    router.push("/tournament");
  };

  if (status === "loading") {
    return (
      <div className={styles.container}>
        <p>Loading...</p>
      </div>
    );
  }
  return (
    <div className={styles.container}>
      <div className="cyber-container glow-animation">
        <div className="circuit-dot circuit-dot-1" />
        <div className="circuit-dot circuit-dot-2" />
        <h1 className="cyber-title">PONG GAME</h1>
        <AvatorCard />
        <div className={styles.buttonContainer}>
          <button
            type="button"
            className="cyber-button"
            onClick={handleOnlineGame}
          >
            オンライン対戦
          </button>
          <button
            type="button"
            className="cyber-button"
            onClick={handleLocalGame}
          >
            ローカル対戦
          </button>
          <button
            type="button"
            className="cyber-button"
            onClick={handleTournament}
          >
            トーナメント
          </button>
        </div>
      </div>
    </div>
  );
}
