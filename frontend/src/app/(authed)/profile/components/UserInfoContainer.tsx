"use client";

import { useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";

import styles from "../profile.module.css";
import DefaultAvator from "../../dashboard/components/DefaultAvator.svg";

export default function UserInfoContainer() {
  const { data: session } = useSession();
  const [isHovering, setIsHovering] = useState(false);

  const handleAvatarEdit = () => {
    // 実装予定: 画像アップロード機能
    console.log("アバター編集ボタンがクリックされました");
  };

  const handlePasswordChange = () => {
    // 実装予定: パスワード変更機能
    console.log("パスワード変更リンクがクリックされました");
  };

  return (
    <div className={styles.userInfoContainer}>
      <div className={styles.avatarWrapper}>
        <div
          className={styles.avatar}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {session?.user?.image ? (
            <Image
              src={session.user.image}
              alt="User Avatar"
              width={120}
              height={120}
              className={styles.avatarImage}
            />
          ) : (
            <DefaultAvator />
          )}
          
          <button 
            className={styles.editAvatarButton}
            onClick={handleAvatarEdit}
            title="プロフィール画像を変更"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
        </div>
        
        <h2 className={styles.userName}>
          {session?.user?.name || "プレイヤー"}
        </h2>
        
        <p className={styles.userEmail}>
          {session?.user?.email || "example@example.com"}
        </p>
        
        <p 
          className={styles.changePasswordLink}
          onClick={handlePasswordChange}
        >
          パスワードを変更する
        </p>
      </div>
    </div>
  );
}
