import styles from "./game.module.css";

interface ErrorModalProps {
  show: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

const ErrorModal = ({
  show,
  title,
  message,
  onClose,
}: ErrorModalProps) => {
  if (!show) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <h3 className={styles.dialogTitle}>{title}</h3>
        <p className={styles.dialogText}>{message}</p>
        <div className={styles.dialogButtons}>
          <button
            onClick={onClose}
            className={`${styles.dialogButton} ${styles.confirmButton}`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;