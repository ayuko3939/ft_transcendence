"use client";

import { useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";

import styles from "../profile.module.css";

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
            <div className={styles.avatarImageContainer}>
              <Image
                src={session.user.image}
                alt="User Avatar"
                width={120}
                height={120}
                className={styles.avatarImage}
              />
              {isHovering && (
                <div
                  className={styles.avatarOverlay}
                  onClick={handleAvatarEdit}
                >
                  <span className={styles.editText}>編集</span>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.avatarImageContainer}>
              <div className={styles.avatarNoImageMsg}>No image</div>
              {isHovering && (
                <div
                  className={styles.avatarOverlay}
                  onClick={handleAvatarEdit}
                >
                  <span className={styles.editText}>アップロード</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.userNameContainer}>
          <h2 className={styles.userName}>
            {session?.user?.name || "プレイヤー"}
          </h2>
          {session?.user?.id && (
            <div className={styles.userIdTooltip}>{session.user.id}</div>
          )}
        </div>

        <p className={styles.userEmail}>
          {session?.user?.email || "example@example.com"}
        </p>

        <p className={styles.changePasswordLink} onClick={handlePasswordChange}>
          パスワードを変更する
        </p>
      </div>
    </div>
  );
}
