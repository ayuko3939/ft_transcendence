"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";

import styles from "../profile.module.css";

export default function UserInfoContainer() {
  const { data: session, update } = useSession();
  const [isHovering, setIsHovering] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarEdit = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      // 1. 署名付きURLを取得
      const formData = new FormData();
      formData.append("fileType", file.type);

      const urlResponse = await fetch("/api/avatar/upload", {
        method: "POST",
        body: formData,
      });

      if (!urlResponse.ok) {
        const errorData = await urlResponse.json();
        throw new Error(errorData.error || "署名付きURLの取得に失敗しました");
      }

      const urlData = await urlResponse.json();
      const { signedUrl, objectKey, publicUrl } = urlData;

      // 2. 署名付きURLを使ってMinIOに直接アップロード
      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("ファイルのアップロードに失敗しました");
      }

      // 3. アップロード成功後、データベースにアバター情報を保存
      const saveResponse = await fetch("/api/avatar/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          objectKey,
          publicUrl,
        }),
      });

      if (!saveResponse.ok) {
        const saveErrorData = await saveResponse.json();
        throw new Error(
          saveErrorData.error || "アバター情報の保存に失敗しました",
        );
      }

      // 4. セッションを更新して新しいアバターを表示
      await update({
        data: {
          user: {
            image: publicUrl,
          },
        },
      });
    } catch (error) {
      console.error("アバターアップロードエラー:", error);
      alert("アバターのアップロードに失敗しました");
    } finally {
      setIsUploading(false);
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handlePasswordChange = () => {
    // 実装予定: パスワード変更機能
    console.log("パスワード変更リンクがクリックされました");
  };

  return (
    <div className={styles.userInfoContainer}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        style={{ display: "none" }}
      />
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
                unoptimized={true} // MinIOの画像はNext.jsのImage Optimizationをバイパス
              />
              {isHovering && (
                <div
                  className={styles.avatarOverlay}
                  onClick={handleAvatarEdit}
                >
                  <span className={styles.editText}>
                    {isUploading ? "アップロード中..." : "編集"}
                  </span>
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
                  <span className={styles.editText}>
                    {isUploading ? "アップロード中..." : "アップロード"}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.userNameContainer}>
          <h2 className={styles.userName}>
            {session?.user?.name || "unknown"}
          </h2>
          {session?.user?.id && (
            <div className={styles.userIdTooltip}>{session.user.id}</div>
          )}
        </div>

        <p className={styles.userEmail}>{session?.user?.email || null}</p>

        <p className={styles.changePasswordLink} onClick={handlePasswordChange}>
          パスワードを変更する
        </p>
      </div>
    </div>
  );
}
