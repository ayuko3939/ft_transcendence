"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function Header() {
  const { data: session, status } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLogout = () => {
    signOut({ redirect: true, callbackUrl: "/login" });
  };

  return (
    <header className="bg-opacity-50 fixed top-0 right-0 left-0 z-10 flex items-center justify-between px-6 py-4 text-white">
      <Link href="/">
        <h1 className="text-2xl font-bold">Pong Game</h1>
      </Link>
      <nav>
        {status === "authenticated" && (
          <div className="flex items-center space-x-4">
            <Link
              href="/profile"
              className="rounded-md border-2 border-cyan-400 bg-transparent px-4 py-2 font-bold text-cyan-400 transition-colors hover:bg-cyan-900/50"
            >
              Profile
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={toggleDropdown}
                className="flex items-center space-x-2 rounded-md p-2 transition-colors hover:bg-cyan-900/50"
              >
                <span className="font-medium">
                  {session?.user?.name || "ユーザー"}
                </span>
                {session?.user?.image ? (
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-cyan-400 bg-cyan-900/30">
                    <Image
                      src={session.user.image}
                      alt="User Avatar"
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                      unoptimized={true} // MinIOの画像はNext.jsのImage Optimizationをバイパスするのでこれが必要
                    />
                  </div>
                ) : null}
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md border border-cyan-400 bg-gray-900/90 py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-cyan-900/50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
