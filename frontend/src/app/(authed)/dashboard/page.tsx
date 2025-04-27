"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import AvatorCard from "./components/AvatorContainer";

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);
  

  return (
    <div>
      <main className="row-start-2 flex flex-col items-center gap-[32px]">
        <h1 className="text-4xl font-bold text-cyan-400">PONG GAME</h1>
        <AvatorCard />
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
