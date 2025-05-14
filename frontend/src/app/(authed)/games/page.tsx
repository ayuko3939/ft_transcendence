"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type GameSession = {
  id: string;
  name: string;
  status: "waiting" | "countdown" | "playing" | "finished" | "abandoned";
  players: {
    left: { userId: string; username: string } | null;
    right: { userId: string; username: string } | null;
  };
  spectatorCount: number;
  createdAt: string;
  score: { left: number; right: number };
};

export default function GamesPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newGameName, setNewGameName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // WebSocketを使ってゲームリストをリアルタイムで更新
  useEffect(() => {
    if (authStatus !== "authenticated") return;

    // WebSocketの接続
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/ws-proxy/game-list`);

    socket.onopen = () => {
      console.log("ゲームリストWebSocket接続が確立されました");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "gameList") {
          setSessions(data.sessions);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("WebSocketメッセージの解析エラー:", error);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket接続エラー:", error);
      setError("ゲームリストの取得中にエラーが発生しました");
      setIsLoading(false);
    };

    socket.onclose = () => {
      console.log("ゲームリストWebSocket接続が閉じられました");
    };

    // コンポーネントのアンマウント時にWebSocket接続を閉じる
    return () => {
      socket.close();
    };
  }, [authStatus]);

  // ゲーム作成ハンドラ
  const handleCreateGame = async () => {
    if (!session?.user) return;
    if (!newGameName.trim()) {
      setError("ゲーム名を入力してください");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/games/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newGameName,
          userId: session.user.id,
          username: session.user.name || "Player",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "ゲームの作成に失敗しました");
        return;
      }

      // 作成したゲームに移動
      router.push(`/games/${data.sessionId}`);
    } catch (error) {
      console.error("ゲーム作成エラー:", error);
      setError("サーバーとの通信に失敗しました");
    } finally {
      setIsCreating(false);
    }
  };

  // ゲーム参加ハンドラ
  const handleJoinGame = (gameId: string, action: "join" | "spectate") => {
    router.push(`/games/${gameId}?action=${action}`);
  };

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

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="cyber-title mb-4">ゲームセッション</h1>
        <div className="cyber-container glow-animation mx-auto max-w-xl">
          <div className="mb-4">
            <h2 className="mb-2 text-center text-xl font-bold text-cyan-400">新しいゲームを作成</h2>
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
              <input
                type="text"
                className="flex-1 rounded-md border-2 border-cyan-400 bg-transparent p-2 text-white"
                placeholder="ゲーム名を入力"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                disabled={isCreating}
              />
              <button
                onClick={handleCreateGame}
                disabled={isCreating || !newGameName.trim()}
                className="cyber-button"
              >
                {isCreating ? "作成中..." : "ゲームを作成"}
              </button>
            </div>
            {error && <p className="mt-2 text-center text-red-500">{error}</p>}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl">
        <h2 className="mb-4 text-center text-2xl font-bold text-cyan-400">アクティブなゲーム</h2>
        {isLoading ? (
          <p className="text-center text-white">ゲームリストを読み込み中...</p>
        ) : sessions.length === 0 ? (
          <p className="text-center text-white">現在アクティブなゲームはありません</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="cyber-container glow-animation rounded-lg p-4"
              >
                <h3 className="mb-2 text-xl font-bold text-cyan-400">{session.name}</h3>
                <div className="mb-2 text-sm text-white">
                  <p>
                    ステータス:{" "}
                    <span className="font-semibold">
                      {session.status === "waiting"
                        ? "プレイヤー待機中"
                        : session.status === "countdown"
                        ? "カウントダウン中"
                        : session.status === "playing"
                        ? "プレイ中"
                        : session.status === "finished"
                        ? "終了"
                        : "中断"}
                    </span>
                  </p>
                  <p>
                    プレイヤー: {session.players.left?.username || "待機中"} vs{" "}
                    {session.players.right?.username || "待機中"}
                  </p>
                  {session.status === "playing" || session.status === "finished" ? (
                    <p>
                      スコア: {session.score.left} - {session.score.right}
                    </p>
                  ) : null}
                  <p>観戦者: {session.spectatorCount}人</p>
                  <p>
                    作成日時:{" "}
                    {new Date(session.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex justify-center space-x-2">
                  {session.status === "waiting" &&
                    (!session.players.left || !session.players.right) && (
                      <button
                        onClick={() => handleJoinGame(session.id, "join")}
                        className="cyber-button"
                      >
                        参加する
                      </button>
                    )}
                  <button
                    onClick={() => handleJoinGame(session.id, "spectate")}
                    className="cyber-button"
                  >
                    観戦する
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
