import { useState } from "react";
import type { TournamentWithDetails } from "@ft-transcendence/shared";

import { Button } from "./button";
import { Card } from "./card";
import { CreateTournamentModal } from "./CreateTournamentModal";
import { useTournament } from "../hooks/useTournament";

export const TournamentLobby = () => {
  const { tournaments, isLoading, error, refetch } = useTournament();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleTournamentCreated = (tournament: TournamentWithDetails) => {
    console.log("トーナメントが作成されました:", tournament);
    refetch(); // 一覧を再取得
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "waiting":
        return "参加者募集中";
      case "in_progress":
        return "進行中";
      case "completed":
        return "終了";
      case "cancelled":
        return "キャンセル";
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center">
          <p className="text-white">トーナメント一覧を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="mb-4 rounded bg-red-600 p-4 text-white">
          <p>エラー: {error}</p>
          <Button
            onClick={refetch}
            className="mt-2 bg-red-700 hover:bg-red-800"
          >
            再試行
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Tournament Lobby</h1>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-500 hover:bg-green-600"
          >
            Create Tournament
          </Button>
        </div>

        {tournaments.length === 0 ? (
          <div className="text-center text-gray-400">
            <p className="mb-4">現在利用可能なトーナメントがありません</p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-green-500 hover:bg-green-600"
            >
              最初のトーナメントを作成
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((tournament) => (
              <Card key={tournament.id} className="bg-gray-800 p-4 text-white">
                <h2 className="mb-2 text-xl font-semibold">
                  {tournament.name}
                </h2>
                <p className="text-gray-400">
                  Participants: {tournament.participants.length}/
                  {tournament.maxParticipants}
                </p>
                <p className="mb-4 text-gray-400">
                  Status: {getStatusText(tournament.status)}
                </p>

                {/* 参加者一覧 */}
                {tournament.participants.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-sm font-medium text-gray-300">
                      参加者:
                    </p>
                    <div className="space-y-1">
                      {tournament.participants.map((participant) => (
                        <p
                          key={participant.id}
                          className="text-sm text-gray-400"
                        >
                          • {participant.userName}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => {
                    /* TODO: Join tournament */
                    console.log("参加処理:", tournament.id);
                  }}
                  className="w-full bg-blue-500 hover:bg-blue-600"
                  disabled={
                    tournament.participants.length >=
                      tournament.maxParticipants ||
                    tournament.status !== "waiting"
                  }
                >
                  {tournament.status === "waiting"
                    ? tournament.participants.length >=
                      tournament.maxParticipants
                      ? "満員"
                      : "参加する"
                    : "参加受付終了"}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateTournamentModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTournamentCreated={handleTournamentCreated}
      />
    </>
  );
};
