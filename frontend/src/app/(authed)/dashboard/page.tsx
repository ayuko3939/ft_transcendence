"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import AvatorCard from "./components/AvatorContainer";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }
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
            onClick={() => router.push("/game")}
          >
            ゲームを始める
          </button>
        </div>
      </div>
    </div>
  );
}
