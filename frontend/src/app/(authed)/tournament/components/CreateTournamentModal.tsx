import type { TournamentWithDetails } from "@ft-transcendence/shared";
import { useState } from "react";

import { Button } from "./button";

interface CreateTournamentModalProps {
  show: boolean;
  onClose: () => void;
  onTournamentCreated: (
    tournament: TournamentWithDetails,
  ) => void;
}

export const CreateTournamentModal = ({
  show,
  onClose,
  onTournamentCreated,
}: CreateTournamentModalProps) => {
  const [name, setName] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/tournament", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          maxParticipants,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "トーナメントの作成に失敗しました");
      }

      onTournamentCreated(data.tournament);
      setName("");
      setMaxParticipants(4);
      onClose();
    } catch (error) {
      console.error("トーナメント作成エラー:", error);
      setError(
        error instanceof Error
          ? error.message
          : "トーナメント作成に失敗しました",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setMaxParticipants(4);
    setError("");
    onClose();
  };

  return (
    <div className="bg-opacity-70 fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="w-full max-w-md rounded-lg bg-gray-800 p-6 text-white">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">新しいトーナメントを作成</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
            type="button"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="tournamentName"
              className="mb-2 block text-sm font-medium"
            >
              トーナメント名
            </label>
            <input
              id="tournamentName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded bg-gray-700 p-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="トーナメント名を入力"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label
              htmlFor="maxParticipants"
              className="mb-2 block text-sm font-medium"
            >
              最大参加者数
            </label>
            <select
              id="maxParticipants"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
              className="w-full rounded bg-gray-700 p-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              disabled={isLoading}
            >
              <option value={2}>2人</option>
              <option value={4}>4人</option>
              <option value={8}>8人</option>
              <option value={16}>16人</option>
            </select>
          </div>

          {error && (
            <div className="rounded bg-red-600 p-2 text-sm text-white">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              onClick={handleClose}
              variant="secondary"
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? "作成中..." : "作成"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
