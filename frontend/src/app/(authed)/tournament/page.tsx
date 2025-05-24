"use client";

import { TournamentBracket } from "./components/TournamentBracket";
import { TournamentLobby } from "./components/TournamentLobby";
import { TournamentResult } from "./components/TournamentResult";
import { TournamentWaitingRoom } from "./components/TournamentWaitingRoom";
import { TournamentProvider, useTournament } from "./context/TournamentContext";
import styles from "./tournament.module.css";

export default function TournamentPage() {
  return (
    <TournamentProvider>
      <TournamentContent />
    </TournamentProvider>
  );
}

function TournamentContent() {
  const { tournamentState, setTournamentState } = useTournament();

  // ダミーの試合結果
  const dummyWinner = {
    id: 1,
    name: "Player1",
    score: 5,
  };

  const renderContent = () => {
    switch (tournamentState) {
      case "lobby":
        return <TournamentLobby />;
      case "waiting":
        return <TournamentWaitingRoom />;
      case "bracket":
        return <TournamentBracket />;
      case "result":
        return <TournamentResult winner={dummyWinner} isFinal={true} />;
      default:
        return <TournamentLobby />;
    }
  };

  return (
    <div className="container mx-auto min-h-screen pt-18 pb-13">
      <div className={styles.tournamentContainer}>
        {/* 仮の切り替えコンポーネント - デバッグ用 */}
        <div className="mb-4 flex space-x-3">
          <button
            type="button"
            className={`rounded px-4 py-2 ${tournamentState === "lobby" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            onClick={() => setTournamentState("lobby")}
          >
            Lobby
          </button>
          <button
            type="button"
            className={`rounded px-4 py-2 ${tournamentState === "waiting" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            onClick={() => setTournamentState("waiting")}
          >
            Waiting Room
          </button>
          <button
            type="button"
            className={`rounded px-4 py-2 ${tournamentState === "bracket" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            onClick={() => setTournamentState("bracket")}
          >
            Tournament Bracket
          </button>
          <button
            type="button"
            className={`rounded px-4 py-2 ${tournamentState === "result" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            onClick={() => setTournamentState("result")}
          >
            Results
          </button>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
