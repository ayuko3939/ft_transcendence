"use client";

import type { TournamentWithDetails } from "@ft-transcendence/shared";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { Button } from "../components/button";
import { Card } from "../components/card";
import styles from "../tournament.module.css";

export default function TournamentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [tournament, setTournament] = useState<TournamentWithDetails | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // チャット機能用の状態
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; text: string; name: string }>
  >([]);
  const [newMessage, setNewMessage] = useState("");

  const tournamentId = params.id as string;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && tournamentId) {
      fetchTournamentDetails();
      // WebSocket接続を開始
      connectToTournamentWebSocket();
    }

    // クリーンアップ
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [status, tournamentId, router]);

  const fetchTournamentDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tournament/${tournamentId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "トーナメントの取得に失敗しました");
      }

      const data = await response.json();
      setTournament(data.tournament);
    } catch (error) {
      console.error("トーナメント詳細取得エラー:", error);
      setError(
        error instanceof Error
          ? error.message
          : "トーナメントの取得に失敗しました",
      );
    } finally {
      setLoading(false);
    }
  };

  const connectToTournamentWebSocket = () => {
    if (!tournamentId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/tournament/${tournamentId}`;

    console.log(`トーナメントWebSocket接続中: ${wsUrl}`);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("トーナメントWebSocket接続完了");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleTournamentWebSocketMessage(data);
      } catch (error) {
        console.error("トーナメントWebSocketメッセージ解析エラー:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("トーナメントWebSocketエラー:", error);
    };

    ws.onclose = (event) => {
      if (event.code !== 1000) {
        console.log("トーナメントWebSocket接続が切断されました");
      }
    };
  };

  const handleTournamentWebSocketMessage = (data: any) => {
    switch (data.type) {
      case "tournamentUpdate":
        // トーナメント情報の更新
        if (data.tournament) {
          setTournament(data.tournament);
        }
        break;
      case "chat":
        // チャットメッセージの受信
        setChatMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            text: data.message,
            name: data.name,
          },
        ]);
        break;
      default:
        console.log("未知のメッセージタイプ:", data.type);
    }
  };

  const handleJoinTournament = async () => {
    if (!session?.user?.id || !tournament) return;

    try {
      setJoining(true);
      const response = await fetch(`/api/tournament/${tournament.id}/join`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "トーナメントへの参加に失敗しました",
        );
      }

      // WebSocket経由で参加通知を送信
      if (wsRef.current) {
        const joinData = {
          type: "join",
          userId: session.user.id,
        };
        wsRef.current.send(JSON.stringify(joinData));
      }
    } catch (error) {
      console.error("トーナメント参加エラー:", error);
      alert(
        error instanceof Error
          ? error.message
          : "トーナメントへの参加に失敗しました",
      );
    } finally {
      setJoining(false);
    }
  };

  const handleStartTournament = async () => {
    if (!session?.user?.id || !tournament) return;

    try {
      setStarting(true);
      const response = await fetch(`/api/tournament/${tournament.id}/start`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "トーナメントの開始に失敗しました");
      }

      // WebSocket経由で開始通知を送信
      if (wsRef.current) {
        const startData = {
          type: "start",
          creatorId: session.user.id,
        };
        wsRef.current.send(JSON.stringify(startData));
      }
    } catch (error) {
      console.error("トーナメント開始エラー:", error);
      alert(
        error instanceof Error
          ? error.message
          : "トーナメントの開始に失敗しました",
      );
    } finally {
      setStarting(false);
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && session?.user?.name && wsRef.current) {
      // WebSocket経由でチャットメッセージを送信
      const chatData = {
        type: "chat",
        name: session.user.name,
        message: newMessage,
      };
      
      wsRef.current.send(JSON.stringify(chatData));
      setNewMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const isUserParticipating = () => {
    return tournament?.participants.some((p) => p.userId === session?.user?.id);
  };

  const isUserCreator = () => {
    return tournament?.creatorId === session?.user?.id;
  };

  const canJoin = () => {
    return (
      tournament?.status === "waiting" &&
      !isUserParticipating() &&
      tournament.participants.length < tournament.maxParticipants
    );
  };

  const canStart = () => {
    return (
      tournament?.status === "waiting" &&
      isUserCreator() &&
      tournament.participants.length >= 2
    );
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "waiting":
        return "参加受付中";
      case "in_progress":
        return "開催中";
      case "completed":
        return "終了";
      case "cancelled":
        return "キャンセル";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "bg-yellow-500 text-black";
      case "in_progress":
        return "bg-blue-500 text-white";
      case "completed":
        return "bg-green-500 text-white";
      case "cancelled":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto flex min-h-screen items-center justify-center p-4">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto flex min-h-screen items-center justify-center p-4">
        <Card className="bg-gray-800 p-8 text-white">
          <h1 className="mb-4 text-2xl font-bold text-red-400">エラー</h1>
          <p className="mb-4">{error}</p>
          <Button onClick={() => router.push("/tournament")}>
            トーナメント一覧に戻る
          </Button>
        </Card>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="container mx-auto flex min-h-screen items-center justify-center p-4">
        <Card className="bg-gray-800 p-8 text-white">
          <h1 className="mb-4 text-2xl font-bold">
            トーナメントが見つかりません
          </h1>
          <Button onClick={() => router.push("/tournament")}>
            トーナメント一覧に戻る
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto min-h-screen pt-18 pb-13">
      <div className={styles.tournamentContainer}>
        {/* ヘッダー */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="secondary"
            onClick={() => router.push("/tournament")}
            className="bg-gray-600 hover:bg-gray-700"
          >
            ← 戻る
          </Button>
          <div className="flex-1 text-center">
            <h1 className="mb-2 text-3xl font-bold text-cyan-400">
              {tournament.name}
            </h1>
            <span
              className={`inline-block rounded px-3 py-1 text-sm font-semibold ${getStatusColor(
                tournament.status,
              )}`}
            >
              {getStatusText(tournament.status)}
            </span>
          </div>
          <div className="w-20"> {/* 右側のスペース確保 */}</div>
        </div>

        {/* トーナメント基本情報 */}
        <Card className="mb-6 bg-gray-800 p-4 text-white">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="text-center">
              <p className="text-sm text-gray-400">参加者</p>
              <p className="text-xl font-bold text-cyan-400">
                {tournament.participants.length} / {tournament.maxParticipants}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-400">作成日</p>
              <p className="text-sm font-medium">
                {new Date(tournament.createdAt).toLocaleDateString("ja-JP")}
              </p>
            </div>
            {tournament.startedAt && (
              <div className="text-center">
                <p className="text-sm text-gray-400">開始日</p>
                <p className="text-sm font-medium">
                  {new Date(tournament.startedAt).toLocaleDateString("ja-JP")}
                </p>
              </div>
            )}
            {tournament.status === "in_progress" && (
              <div className="text-center">
                <p className="text-sm text-gray-400">現在のラウンド</p>
                <p className="text-xl font-bold text-cyan-400">
                  {tournament.currentRound}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* メインコンテンツ（TournamentWaitingRoomのレイアウトを使用） */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* 参加者リスト */}
          <Card className="bg-gray-800 p-4 text-white">
            <h2 className="mb-4 text-xl font-semibold">参加者</h2>
            <div className="space-y-2">
              {tournament.participants.length === 0 ? (
                <p className="py-4 text-center text-gray-400">
                  まだ参加者がいません
                </p>
              ) : (
                tournament.participants.map((participant) => (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between space-x-2 rounded bg-gray-700 p-3 ${
                      participant.userId === session?.user?.id
                        ? "ring-2 ring-cyan-400"
                        : ""
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span>👤</span>
                      <span className="font-medium">
                        {participant.userName}
                      </span>
                    </div>
                    <div className="items-between flex flex-row space-x-2">
                      {tournament.creatorId === participant.userId && (
                        <span className="rounded bg-yellow-500 px-2 py-1 text-xs font-bold text-black">
                          主催者
                        </span>
                      )}
                      <span className="mt-1 text-xs text-gray-400">
                        {participant.status === "active"
                          ? "参加中"
                          : participant.status === "eliminated"
                            ? "脱落"
                            : participant.status === "winner"
                              ? "優勝"
                              : participant.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* チャット */}
          <Card className="bg-gray-800 p-4 text-white md:col-span-2">
            <h2 className="mb-4 text-xl font-semibold">チャット</h2>
            <div className="mb-4 h-64 space-y-2 overflow-y-auto rounded bg-gray-900 p-3">
              {chatMessages.length === 0 ? (
                <p className="py-4 text-center text-gray-400">
                  まだメッセージがありません
                </p>
              ) : (
                chatMessages.map((message) => (
                  <div key={message.id} className="rounded bg-gray-700 p-2">
                    <span className="font-bold text-cyan-400">
                      {message.name}:
                    </span>
                    <span className="ml-2">{message.text}</span>
                  </div>
                ))
              )}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 rounded bg-gray-700 p-2 text-white placeholder-gray-400 focus:bg-gray-600 focus:outline-none"
                placeholder="メッセージを入力..."
                disabled={!isUserParticipating()}
              />
              <Button
                onClick={handleSendMessage}
                className="bg-blue-500 hover:bg-blue-600"
                disabled={!isUserParticipating() || !newMessage.trim()}
              >
                送信
              </Button>
            </div>
            {!isUserParticipating() && (
              <p className="mt-2 text-xs text-gray-400">
                チャットに参加するにはトーナメントに参加してください
              </p>
            )}
          </Card>
        </div>

        {/* アクションボタン */}
        <div className="mt-6 flex justify-center space-x-4">
          {canJoin() && (
            <Button
              onClick={handleJoinTournament}
              disabled={joining}
              className="bg-green-500 px-8 py-3 hover:bg-green-600"
            >
              {joining ? "参加中..." : "トーナメントに参加"}
            </Button>
          )}
          {canStart() && (
            <Button
              onClick={handleStartTournament}
              disabled={starting}
              className="bg-blue-500 px-8 py-3 hover:bg-blue-600"
            >
              {starting ? "開始中..." : "トーナメントを開始"}
            </Button>
          )}
          {isUserParticipating() &&
            tournament.status === "waiting" &&
            !canStart() && (
              <div className="flex items-center px-8 py-3 text-green-400">
                ✓ 参加済み - 開始をお待ちください
              </div>
            )}
        </div>

        {/* トーナメントブラケット（開催中・終了時） */}
        {(tournament.status === "in_progress" ||
          tournament.status === "completed") && (
          <Card className="mt-6 bg-gray-800 p-6 text-white">
            <h2 className="mb-4 text-xl font-bold">トーナメントブラケット</h2>
            {tournament.currentMatches &&
            tournament.currentMatches.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  ラウンド {tournament.currentRound}
                </h3>
                {tournament.currentMatches.map((match) => {
                  // ログインユーザーがこの試合に参加しているかチェック
                  const isUserInMatch =
                    match.player1Id === session?.user?.id ||
                    match.player2Id === session?.user?.id;

                  // プレイヤー名を取得
                  const player1Name =
                    tournament.participants.find(
                      (p) => p.userId === match.player1Id,
                    )?.userName || "Unknown Player";
                  const player2Name =
                    tournament.participants.find(
                      (p) => p.userId === match.player2Id,
                    )?.userName || "Unknown Player";

                  return (
                    <div
                      key={match.id}
                      className={`rounded bg-gray-700 p-4 ${
                        isUserInMatch ? "ring-2 ring-cyan-400" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className="font-semibold">
                            試合 {match.matchNumber}:
                          </span>
                          <span>
                            {player1Name} vs {player2Name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-sm">
                            {match.status === "pending"
                              ? "待機中"
                              : match.status === "in_progress"
                                ? "進行中"
                                : match.status === "completed"
                                  ? "完了"
                                  : match.status}
                          </div>
                          {/* 自分が参加する試合で待機中の場合に試合開始ボタンを表示 */}
                          {isUserInMatch && match.status === "pending" && (
                            <Button
                              onClick={() =>
                                router.push(
                                  `/tournament/${tournament.id}/match/${match.id}`,
                                )
                              }
                              className="bg-green-500 hover:bg-green-600"
                              size="sm"
                            >
                              試合開始
                            </Button>
                          )}
                          {/* 進行中の場合は観戦ボタン */}
                          {isUserInMatch && match.status === "in_progress" && (
                            <Button
                              onClick={() =>
                                router.push(
                                  `/tournament/${tournament.id}/match/${match.id}`,
                                )
                              }
                              className="bg-blue-500 hover:bg-blue-600"
                              size="sm"
                            >
                              試合に参加
                            </Button>
                          )}
                        </div>
                      </div>
                      {isUserInMatch && (
                        <div className="mt-2 text-xs text-cyan-400">
                          あなたの試合です
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400">試合情報を読み込み中...</p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
