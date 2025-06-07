"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface Friend {
  id: string;
  name: string;
  image: string | null;
  isOnline: boolean;
}

export default function FriendsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [friendId, setFriendId] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      loadFriends();
    }
  }, [status]);

  const loadFriends = async () => {
    try {
      const response = await fetch("/api/friends");
      if (!response.ok) {
        throw new Error("友達一覧の取得に失敗しました");
      }
      const data = await response.json();
      setFriends(data.friends);
    } catch (error) {
      setError("友達一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const addFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendId.trim()) return;

    setAdding(true);
    setError("");

    try {
      const response = await fetch("/api/friends", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ friendId: friendId.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "友達追加に失敗しました");
      }

      setFriendId("");
      loadFriends();
    } catch (error) {
      setError(error instanceof Error ? error.message : "友達追加に失敗しました");
    } finally {
      setAdding(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto min-h-screen pt-20 pb-13 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-cyan-400 mb-8 text-center">
          Friends
        </h1>

        {/* 友達追加フォーム */}
        <div className="bg-gray-800 p-6 rounded-lg border border-cyan-400 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">友達を追加</h2>
          <form onSubmit={addFriend} className="flex gap-3">
            <input
              type="text"
              value={friendId}
              onChange={(e) => setFriendId(e.target.value)}
              placeholder="ユーザーIDを入力"
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
              disabled={adding}
            />
            <button
              type="submit"
              disabled={adding || !friendId.trim()}
              className="px-6 py-2 bg-cyan-400 text-black font-semibold rounded hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? "追加中..." : "追加"}
            </button>
          </form>
          {error && (
            <p className="mt-3 text-red-400 text-sm">{error}</p>
          )}
        </div>

        {/* 友達一覧 */}
        <div className="bg-gray-800 p-6 rounded-lg border border-cyan-400">
          <h2 className="text-xl font-semibold text-white mb-4">
            友達一覧 ({friends.length})
          </h2>
          
          {friends.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              まだ友達がいません
            </p>
          ) : (
            <div className="space-y-3">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center space-x-4 p-3 bg-gray-700 rounded-lg"
                >
                  {/* オンライン状況アイコン */}
                  <div className="flex-shrink-0">
                    <span
                      className={`inline-block w-3 h-3 rounded-full ${
                        friend.isOnline ? "bg-green-400" : "bg-gray-400"
                      }`}
                      title={friend.isOnline ? "オンライン" : "オフライン"}
                    />
                  </div>

                  {/* アバター */}
                  <div className="flex-shrink-0">
                    {friend.image ? (
                      <Image
                        src={friend.image}
                        alt={friend.name || "User"}
                        width={40}
                        height={40}
                        className="rounded-full"
                        unoptimized={true}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-gray-300 text-sm">👤</span>
                      </div>
                    )}
                  </div>

                  {/* ユーザー情報 */}
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      {friend.name || "Unknown User"}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {friend.isOnline ? "オンライン" : "オフライン"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
