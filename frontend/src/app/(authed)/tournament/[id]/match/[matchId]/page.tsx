"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// SSRを無効化したコンポーネントの読み込み
const TournamentPongGame = dynamic(
  () => import("./components/TournamentPongGame"),
  {
    ssr: false,
  },
);

interface TournamentMatchInfo {
  id: string;
  tournamentId: string;
  round: number;
  matchNumber: number;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  status: "pending" | "in_progress" | "completed";
}

export default function TournamentMatchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();

  const tournamentId = params.id as string;
  const matchId = params.matchId as string;

  const [matchInfo, setMatchInfo] = useState<TournamentMatchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGameReady, setIsGameReady] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && tournamentId && matchId) {
      fetchMatchInfo();
    }
  }, [status, tournamentId, matchId]);

  useEffect(() => {
    window.history.pushState(null, "", window.location.pathname);
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const message =
        "トーナメントマッチをプレイ中です。このページを離れますか？";
      (e || window.event).returnValue = message;
      return message;
    };

    const handlePopState = () => {
      if (isGameReady) {
        const confirmLeave = confirm(
          "トーナメントマッチをプレイ中です。このページを離れますか？",
        );
        if (!confirmLeave) {
          window.history.pushState(null, "", window.location.pathname);
        }
      }
    };

    if (isGameReady) {
      window.addEventListener("beforeunload", handleBeforeUnload);
      window.addEventListener("popstate", handlePopState);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isGameReady]);

  const fetchMatchInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/tournament/${tournamentId}/match/${matchId}`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "マッチ情報の取得に失敗しました");
      }

      const data = await response.json();
      setMatchInfo(data.match);
    } catch (error) {
      console.error("マッチ情報取得エラー:", error);
      setError(
        error instanceof Error
          ? error.message
          : "マッチ情報の取得に失敗しました",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGameReady = () => {
    setIsGameReady(false);
  };

  if (status === "loading" || loading) {
    return (
      <div className="relative z-5 flex min-h-screen items-center justify-center overflow-hidden">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative z-5 flex min-h-screen items-center justify-center overflow-hidden">
        <div className="text-center text-white">
          <p className="mb-4 text-red-400">{error}</p>
          <button
            onClick={() => router.push(`/tournament/${tournamentId}`)}
            className="cyber-button"
          >
            トーナメントに戻る
          </button>
        </div>
      </div>
    );
  }

  if (!matchInfo) {
    return (
      <div className="relative z-5 flex min-h-screen items-center justify-center overflow-hidden">
        <p className="text-white">マッチ情報が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center pt-18 pb-13">
      <main>
        <TournamentPongGame
          matchInfo={matchInfo}
          onGameReady={handleGameReady}
        />
      </main>
    </div>
  );
}
