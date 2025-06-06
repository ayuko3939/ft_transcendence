"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { TournamentLobby } from "./components/TournamentLobby";
import styles from "./tournament.module.css";

export default function TournamentPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-white">
        <p>Loading...</p>
      </div>
    );
  }

  return <TournamentContent />;
}

function TournamentContent() {
  return (
    <div className="container mx-auto min-h-screen pt-18 pb-13">
      <div className={styles.tournamentContainer}>
        <TournamentLobby />
      </div>
    </div>
  );
}
