"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

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
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-rows-[20px_1fr_20px] items-center justify-items-center gap-16 bg-gray-900 p-8 pb-20 font-[family-name:var(--font-geist-sans)] text-cyan-400 sm:p-20">
      <main className="row-start-2 flex flex-col items-center gap-[32px]">
        <h1 className="text-4xl font-bold text-cyan-400">PONG GAME</h1>
        <p className="text-xl">
          ようこそ、{session?.user?.name || "プレイヤー"}さん
        </p>
        <Image
          src={session?.user?.image || "プレイヤー"}
          alt="User Avatar"
          width={50}
          height={50}
          className="rounded-lg shadow-lg"/>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <button
            type="button"
            className="z-10 rounded-md border-2 border-cyan-400 bg-transparent px-6 py-3 font-bold text-cyan-400 transition-colors hover:bg-cyan-900"
            onClick={() => router.push("/game")}
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
