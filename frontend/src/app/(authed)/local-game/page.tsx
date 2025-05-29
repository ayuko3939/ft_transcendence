"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// SSRを無効化したコンポーネントの読み込み
const LocalPongGame = dynamic(() => import("./components/PongGame_local"), {
  ssr: false,
});

export default function LocalGame() {
  const { status } = useSession();
  const router = useRouter();
  const [isGameReady, setIsGameReady] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    window.history.pushState(null, "", window.location.pathname);
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const message = "ゲームをプレイ中です。このページを離れますか？";
      (e || window.event).returnValue = message;
      return message;
    };

    const handlePopState = () => {
      if (isGameReady) {
        const confirmLeave = confirm(
          "ゲームをプレイ中です。このページを離れますか？",
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

  const handleGameReady = () => {
    setIsGameReady(false);
  };

  if (status === "loading") {
    return (
      <div className="relative z-5 flex min-h-screen items-center justify-center overflow-hidden">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center pt-18 pb-13">
      <main>
        <LocalPongGame />
      </main>
    </div>
  );
}
