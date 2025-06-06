import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/(authed)/tournament/components/button";
import { user } from "@ft-transcendence/shared";
import { InferSelectModel } from "drizzle-orm";

import styles from "./TournamentResult.module.css";

type User = InferSelectModel<typeof user>;

interface TournamentResultProps {
  show: boolean;
  winnerId: string;
  onClose: () => void;
}

export const TournamentResult = ({
  show,
  winnerId,
  onClose,
}: TournamentResultProps) => {
  const router = useRouter();
  const [winnerData, setWinnerData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWinnerData = async () => {
      if (!winnerId) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/user?userId=${winnerId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "ユーザーデータの取得に失敗しました",
          );
        }
        const userData: User = await response.json();
        setWinnerData(userData);
      } catch (err) {
        console.error("ユーザーデータ取得エラー:", err);
        setError(
          err instanceof Error
            ? err.message
            : "ユーザーデータの取得に失敗しました",
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchWinnerData();
  }, [winnerId]);

  if (!show) return null;

  const handleClose = () => {
    onClose();
  };

  const handleReturnToLobby = () => {
    router.push("/tournament");
  };

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.modalCloseButton}
          onClick={handleClose}
          aria-label="閉じる"
        />
        <div className={styles.resultContainer}>
          <h1 className={styles.resultTitle}>
            <p>Tournament Champion!</p>
          </h1>
          <div className={styles.winnerSection}>
            {isLoading && <div className={styles.loading}>読み込み中...</div>}

            {error && <div className={styles.error}>エラー: {error}</div>}

            {winnerData && !isLoading && !error && (
              <>
                {winnerData.image ? (
                  <div className={styles.winnerImageContainer}>
                    <Image
                      src={winnerData.image}
                      alt={winnerData.name || "Winner"}
                      width={100}
                      height={100}
                      className={styles.winnerImage}
                      unoptimized={true}
                    />
                  </div>
                ) : (
                  <div className={styles.trophy}>🏆</div>
                )}
                <div className={styles.winnerName}>
                  {winnerData.name || "Unknown Player"}
                </div>
              </>
            )}

            {!winnerData && !isLoading && !error && (
              <div className={styles.winnerName}>Unknown Player</div>
            )}
          </div>

          <div className={styles.buttonContainer}>
            <Button
              onClick={handleReturnToLobby}
              className={styles.returnButton}
            >
              ロビーに戻る
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
