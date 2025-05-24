import { useRouter } from "next/navigation";

import { Button } from "./button";

export const TournamentButton = () => {
  const router = useRouter();

  return (
    <Button
      onClick={() => router.push("/tournament")}
      className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 font-bold text-white shadow-lg transition-all duration-300 hover:from-purple-600 hover:to-pink-600"
    >
      Tournament
    </Button>
  );
};
