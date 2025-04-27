"use client";

import { signOut } from "next-auth/react";

export default function Header() {
  return (
    <header className="flex items-center justify-between bg-black p-4 text-white">
      <h1 className="text-2xl font-bold">Pong Game</h1>
      <nav>
        <ul className="flex space-x-4">
          <li>
            <a href="/home" className="hover:text-gray-400">
              Home
            </a>
          </li>
          <li>
            <a href="/about" className="hover:text-gray-400">
              About
            </a>
          </li>
          <li>
            <a href="/contact" className="hover:text-gray-400">
              Contact
            </a>
          </li>
          <li>
            <button
              onClick={() => signOut({ redirect: true, callbackUrl: "/login" })}
              className="rounded-md border-2 border-cyan-400 bg-transparent px-6 py-3 font-bold text-cyan-400 transition-colors hover:bg-cyan-900"
            >
              Sign Out
            </button>
          </li>
        </ul>
      </nav>
    </header>
  );
}
