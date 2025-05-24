import { useTournament } from "../context/TournamentContext";
import { Button } from "./button";
import { Card } from "./card";

interface TournamentResultProps {
  winner: {
    id: number;
    name: string;
    score: number;
  };
  isFinal: boolean;
}

export const TournamentResult = ({
  winner,
  isFinal,
}: TournamentResultProps) => {
  const { setTournamentState } = useTournament();

  return (
    <div className="container mx-auto flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 p-8 text-center text-white">
        <h1 className="mb-6 text-3xl font-bold">
          {isFinal ? "Tournament Champion!" : "Match Result"}
        </h1>
        <div className="mb-8">
          <div className="mb-4 text-6xl">🏆</div>
          <div className="mb-2 text-2xl font-semibold text-green-400">
            {winner.name}
          </div>
          <div className="text-gray-400">Score: {winner.score}</div>
        </div>
        {isFinal ? (
          <Button
            onClick={() => {
              setTournamentState("lobby");
            }}
            className="w-full bg-blue-500 hover:bg-blue-600"
          >
            Return to Tournament Lobby
          </Button>
        ) : (
          <div className="text-gray-400">Waiting for next match...</div>
        )}
      </Card>
    </div>
  );
};
