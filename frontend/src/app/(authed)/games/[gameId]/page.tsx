"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";

// SSRを無効化したPongGameコンポーネントを読み込み
const PongGameComponent = dynamic(() => import("../../../game/_components/PongGameSession"), {
  ssr: false,
});

interface GamePageProps {
  params: { gameId: string };
}

export default function GamePage({ params }: GamePageProps) {
  const { gameId } = params;
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const searchParams = useSearchParams();
  const action = searchParams.get("action") || "join";
  const [error, setError] = useState<string | null>(null);

  // ゲームセッションの存在を確認
  useEffect(() => {
    if (authStatus !== "authenticated") return;

    const checkGameSession = async () => {
      try {
        const response = await fetch(`/api/games/sessions/${gameId}`);
        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "ゲームセッションが見つかりません");
          setTimeout(() => {
            router.push("/games");
          }, 3000);
        }
      } catch (error) {
        console.error("ゲームセッション確認エラー:", error);
        setError("サーバーとの通信に失敗しました");
        setTimeout(() => {
          router.push("/games");
        }, 3000);
      }
    };

    checkGameSession();
  }, [gameId, authStatus, router]);

  if (authStatus === "unauthenticated") {
    router.push("/login");
    return null;
  }

  if (authStatus === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="cyber-container glow-animation max-w-md p-6 text-center">
          <p className="text-xl text-red-500">{error}</p>
          <p className="mt-4 text-white">ゲーム一覧に戻ります...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <PongGameComponent 
        gameId={gameId} 
        action={action as "join" | "spectate"} 
        userId={session?.user?.id || ""} 
        username={session?.user?.name || "Player"} 
      />
    </div>
  );
}
