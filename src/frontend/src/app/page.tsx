"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // ログインチェック中は何も表示しない
  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black text-white">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] bg-gray-900 text-cyan-400">
      <main className="flex flex-col gap-[32px] row-start-2 items-center">
        <h1 className="text-4xl font-bold text-cyan-400">PONG GAME</h1>
        <p className="text-xl">ようこそ、{session?.user?.name || "プレイヤー"}さん</p>
        
        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <button
            className="rounded-md border-2 border-cyan-400 bg-transparent hover:bg-cyan-900 transition-colors text-cyan-400 font-bold py-3 px-6"
            onClick={() => console.log("ゲーム開始")}
          >
            ゲームを始める
          </button>
        </div>
      </main>
      <footer className="row-start-3 text-sm text-cyan-600">
        ©2025 PONG MASTERS
      </footer>
    </div>
  );
}
