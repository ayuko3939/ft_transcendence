"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";

import styles from "../dashboard.module.css";
import DefaultAvator from "./DefaultAvator.svg";

export default function AvatorCard() {
  const { data: session } = useSession();
  return (
    <div className={styles.userInfoContainer}>
      <div className={styles.avatarWrapper}>
        <div className={styles.avatar}>
          {session?.user?.image ? (
            <Image
              src={session.user.image}
              alt="User Avatar"
              width={100}
              height={100}
            />
          ) : (
            <DefaultAvator />
          )}
        </div>
        <p className={styles.welcomeText}>
          ようこそ、{session?.user?.name || "プレイヤー"}さん
        </p>
      </div>
    </div>
  );
}
