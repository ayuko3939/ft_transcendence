"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";

export type TournamentState = "lobby" | "waiting" | "bracket" | "result";

interface TournamentContextType {
  tournamentState: TournamentState;
  setTournamentState: (state: TournamentState) => void;
  currentTournament: number | null;
  setCurrentTournament: (id: number | null) => void;
  joinTournament: (tournamentId: number) => void;
  leaveTournament: () => void;
  goToLobby: () => void;
  goToWaitingRoom: () => void;
  goToBracket: () => void;
  goToResult: () => void;
}

const TournamentContext = createContext<TournamentContextType | undefined>(
  undefined,
);

interface TournamentProviderProps {
  children: ReactNode;
}

export function TournamentProvider({ children }: TournamentProviderProps) {
  const [tournamentState, setTournamentState] =
    useState<TournamentState>("lobby");
  const [currentTournament, setCurrentTournament] = useState<number | null>(
    null,
  );

  const joinTournament = (tournamentId: number) => {
    setCurrentTournament(tournamentId);
    setTournamentState("waiting");
  };

  const leaveTournament = () => {
    setCurrentTournament(null);
    setTournamentState("lobby");
  };

  const goToLobby = () => setTournamentState("lobby");
  const goToWaitingRoom = () => setTournamentState("waiting");
  const goToBracket = () => setTournamentState("bracket");
  const goToResult = () => setTournamentState("result");

  const value: TournamentContextType = {
    tournamentState,
    setTournamentState,
    currentTournament,
    setCurrentTournament,
    joinTournament,
    leaveTournament,
    goToLobby,
    goToWaitingRoom,
    goToBracket,
    goToResult,
  };

  return (
    <TournamentContext.Provider value={value}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const context = useContext(TournamentContext);
  if (context === undefined) {
    throw new Error("useTournament must be used within a TournamentProvider");
  }
  return context;
}
