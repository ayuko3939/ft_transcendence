import type { TournamentWithDetails } from "@ft-transcendence/shared";
import { useEffect, useState } from "react";

interface UseTournamentReturn {
  tournaments: TournamentWithDetails[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  createTournament: (
    name: string,
    maxParticipants: number,
  ) => Promise<TournamentWithDetails>;
}

export function useTournament(): UseTournamentReturn {
  const [tournaments, setTournaments] = useState<TournamentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTournaments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/tournament");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "トーナメント一覧の取得に失敗しました");
      }

      setTournaments(data.tournaments || []);
    } catch (error) {
      console.error("トーナメント取得エラー:", error);
      setError(
        error instanceof Error
          ? error.message
          : "トーナメント一覧の取得に失敗しました",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const createTournament = async (
    name: string,
    maxParticipants: number,
  ): Promise<TournamentWithDetails> => {
    const response = await fetch("/api/tournament", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, maxParticipants }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "トーナメントの作成に失敗しました");
    }

    // 作成後、一覧を再取得
    fetchTournaments();

    return data.tournament;
  };

  const refetch = () => {
    fetchTournaments();
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  return {
    tournaments,
    isLoading,
    error,
    refetch,
    createTournament,
  };
}
