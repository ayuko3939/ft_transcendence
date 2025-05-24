import styles from "./game.module.css";

interface ConfirmDialogProps {
  show: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({ show, title, message, onConfirm, onCancel }: ConfirmDialogProps) => {
  if (!show) return null;

  return (
    <div className={styles.dialogOverlay}>
      <div className={styles.dialog}>
        <p className={styles.dialogText}>{message}</p>
        <div className={styles.dialogButtons}>
          <button
            onClick={onConfirm}
            className={`${styles.dialogButton} ${styles.confirmButton}`}
          >
            はい
          </button>
          <button
            onClick={onCancel}
            className={`${styles.dialogButton} ${styles.cancelButton}`}
          >
            いいえ
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
