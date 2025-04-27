"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";

import DefaultAvator from "./DefaultAvator.svg";

export default function AvatorCard() {
  const { data: session, status } = useSession();

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center text-white">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-xl">
        ようこそ、{session?.user?.name || "プレイヤー"}さん
      </p>
      {session?.user?.image ? (
        <Image
          src={session.user.image}
          alt="User Avatar"
          width={50}
          height={50}
          className="rounded-lg shadow-lg"
        />
      ) : (
        <DefaultAvator />
      )}
    </div>
  );
}
