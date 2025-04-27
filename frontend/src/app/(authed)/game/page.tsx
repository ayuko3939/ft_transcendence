"use client";

import dynamic from "next/dynamic";

// SSRを無効化したコンポーネントの読み込み
const CanvasComponent = dynamic(() => import("./_components/PongGame"), {
  ssr: false,
});

export default function Game() {
  return (
    <div className="grid min-h-screen place-items-center">
      <main>
        <CanvasComponent />
      </main>
    </div>
  );
}
