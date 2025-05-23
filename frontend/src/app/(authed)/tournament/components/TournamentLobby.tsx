import { useState } from "react";

import { Button } from "./button";
import { Card } from "./card";

// ダミーデータ
const dummyTournaments = [
  {
    id: 1,
    name: "Weekend Tournament",
    participants: 4,
    maxParticipants: 8,
    status: "waiting",
  },
  {
    id: 2,
    name: "Quick Tournament",
    participants: 8,
    maxParticipants: 8,
    status: "starting",
  },
];

export const TournamentLobby = () => {
  const [tournaments, setTournaments] = useState(dummyTournaments);

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Tournament Lobby</h1>
        <Button
          onClick={() => {
            /* TODO: Create new tournament */
          }}
          className="bg-green-500 hover:bg-green-600"
        >
          Create Tournament
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tournaments.map((tournament) => (
          <Card key={tournament.id} className="bg-gray-800 p-4 text-white">
            <h2 className="mb-2 text-xl font-semibold">{tournament.name}</h2>
            <p className="text-gray-400">
              Participants: {tournament.participants}/
              {tournament.maxParticipants}
            </p>
            <p className="mb-4 text-gray-400">Status: {tournament.status}</p>
            <Button
              onClick={() => {
                /* TODO: Join tournament */
              }}
              className="w-full bg-blue-500 hover:bg-blue-600"
              disabled={tournament.participants >= tournament.maxParticipants}
            >
              Join Tournament
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};
