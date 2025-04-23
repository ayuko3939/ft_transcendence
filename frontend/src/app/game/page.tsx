"use client";

// import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
// import { useRouter } from "next/navigation";

import "./game.css";


// SSRを無効化したコンポーネントの読み込み
const CanvasComponent = dynamic(() => import("./_components/PongGame"), {
  ssr: false,
});

export default function Game() {
  return (
    <div className="grid min-h-screen items-center justify-items-center gap-16 bg-gray-900 p-8 pb-20 font-[family-name:var(--font-geist-sans)] text-cyan-400 sm:p-20">
    <main>
      <CanvasComponent />
    </main>
    </div>
  );
}