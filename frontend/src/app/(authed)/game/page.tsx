"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// SSRを無効化したコンポーネントの読み込み
const CanvasComponent = dynamic(() => import("./_components/PongGame"), {
  ssr: false,
});

export default function Game() {
  const [isGameReady, setIsGameReady] = useState(true);

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

  return (
    <div className="grid min-h-screen place-items-center">
      <main>
        <CanvasComponent />
      </main>
    </div>
  );
}
