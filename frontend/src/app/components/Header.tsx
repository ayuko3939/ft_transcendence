"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function Header() {
  const { status } = useSession();

  return (
    <header className="bg-opacity-50 fixed top-0 right-0 left-0 z-10 flex items-center justify-between px-6 py-4 text-white">
      <Link href="/">
        <h1 className="text-2xl font-bold">Pong Game</h1>
      </Link>
      <nav>
        <ul className="flex space-x-4">
          {status === "authenticated" ? (
            <li>
              <button
                type="button"
                onClick={() =>
                  signOut({ redirect: true, callbackUrl: "/login" })
                }
                className="rounded-md border-2 border-cyan-400 bg-transparent px-6 py-3 font-bold text-cyan-400 transition-colors hover:bg-cyan-900"
              >
                Sign Out
              </button>
            </li>
          ) : null}
        </ul>
      </nav>
    </header>
  );
}
