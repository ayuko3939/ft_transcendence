"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

const DefaultAvatar = () => (
  <svg version="1.1" id="_x32_" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style={{ width: '32px', height: '32px', opacity: 1 }}>
    <g>
      <path fill="#ffffff" d="M332.933,213.451c-20.713,17.784-47.559,28.624-76.938,28.624c-29.37,0-56.224-10.84-76.928-28.624
        c-54.991,20.952-92.686,66.126-92.686,132.094v98.082c0,0,14.505,19.331,45.864,37.437v-69.339h28.992v83.228
        c24.848,9.78,56.243,17.047,94.758,17.047c38.524,0,69.901-7.266,94.767-17.047v-83.228h28.992v69.339
        c31.359-18.106,45.864-37.437,45.864-37.437v-98.082C425.618,279.577,387.923,234.403,332.933,213.451z" />
      <path fill="#ffffff" d="M255.996,213.902c49.299,0,89.26-39.96,89.26-89.259V89.269C345.255,39.96,305.294,0,255.996,0
        c-49.3,0-89.268,39.96-89.268,89.269v35.374C166.727,173.942,206.696,213.902,255.996,213.902z" />
    </g>
  </svg>
);

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
                <span className="font-medium">{session?.user?.name || "ユーザー"}</span>
                <div className="h-8 w-8 overflow-hidden rounded-full border-2 border-cyan-400 flex items-center justify-center bg-cyan-900/30">
                  {session?.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt="User Avatar"
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <DefaultAvatar />
                  )}
                </div>
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
