import { Card } from "./card";

// ダミーデータ
const dummyMatches = [
  {
    id: 1,
    round: 1,
    player1: { id: 1, name: "Player1", score: 5 },
    player2: { id: 2, name: "Player2", score: 3 },
    winner: 1,
  },
  {
    id: 2,
    round: 1,
    player1: { id: 3, name: "Player3", score: 2 },
    player2: { id: 4, name: "Player4", score: 5 },
    winner: 4,
  },
  {
    id: 3,
    round: 2,
    player1: { id: 1, name: "Player1", score: 5 },
    player2: { id: 4, name: "Player4", score: 4 },
    winner: 1,
  },
];

export const TournamentBracket = () => {
  const rounds = Math.max(...dummyMatches.map((match) => match.round));

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-bold text-white">Tournament Bracket</h1>
      <div className="flex justify-between">
        {Array.from({ length: rounds }, (_, i) => i + 1).map((round) => (
          <div key={round} className="flex-1">
            <h2 className="mb-4 text-xl font-semibold text-white">
              Round {round}
            </h2>
            <div className="space-y-4">
              {dummyMatches
                .filter((match) => match.round === round)
                .map((match) => (
                  <Card
                    key={match.id}
                    className={`p-4 ${
                      match.winner === match.player1.id
                        ? "bg-green-900"
                        : match.winner === match.player2.id
                          ? "bg-green-900"
                          : "bg-gray-800"
                    } text-white`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div
                          className={`${
                            match.winner === match.player1.id
                              ? "text-green-400"
                              : ""
                          }`}
                        >
                          {match.player1.name} ({match.player1.score})
                        </div>
                        <div
                          className={`${
                            match.winner === match.player2.id
                              ? "text-green-400"
                              : ""
                          }`}
                        >
                          {match.player2.name} ({match.player2.score})
                        </div>
                      </div>
                      <div className="text-sm text-gray-400">
                        Match {match.id}
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
