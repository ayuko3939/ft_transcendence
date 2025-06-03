"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { logUserAction } from "@/lib/clientLogger";

import PasswordChangeModal from "./PasswordChangeModal";

export default function Header() {
  const { data: session, status } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handlePasswordChange = () => {
    setIsPasswordModalOpen(true);
  };
  const handleClosePasswordModal = () => {
    setIsPasswordModalOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLogout = () => {
    const userId = session?.user?.id;
    logUserAction("ログアウト", userId);
    signOut({ redirect: true, callbackUrl: "/login" });
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={toggleDropdown}
                className="flex items-center space-x-2 rounded-md p-2 transition-colors hover:bg-cyan-900/50 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                id="user-menu-button"
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
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
                      unoptimized={true}
                    />
                  </div>
                ) : null}
              </button>

              <div
                className={`absolute right-0 mt-2 w-48 origin-top-right rounded-md border border-cyan-400 bg-gray-900/90 py-1 shadow-lg ring-1 ring-black/5 transition-all duration-100 ease-in-out ${
                  isDropdownOpen
                    ? "scale-100 transform opacity-100"
                    : "pointer-events-none scale-95 transform opacity-0"
                }`}
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="user-menu-button"
                tabIndex={-1}
              >
                {session?.user?.provider === "credentials" && (
                  <button
                    type="button"
                    onClick={handlePasswordChange}
                    className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-cyan-900/50 focus:bg-cyan-900/70 focus:outline-none"
                    role="menuitem"
                    tabIndex={-1}
                  >
                    Change Password
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-cyan-900/50 focus:bg-cyan-900/70 focus:outline-none"
                  role="menuitem"
                  tabIndex={-1}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={handleClosePasswordModal}
      />
    </header>
  );
}
