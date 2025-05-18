"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import MatchHistory from "./components/MatchHistory";
import StatsContainer from "./components/StatsContainer";
import UserInfoContainer from "./components/UserInfoContainer";
import styles from "./profile.module.css";

export default function ProfilePage() {
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <UserInfoContainer />
        <StatsContainer />
      </div>
      <MatchHistory />
    </div>
  );
}
