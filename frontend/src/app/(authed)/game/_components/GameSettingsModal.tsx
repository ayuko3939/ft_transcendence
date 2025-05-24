import type { GameSettings } from "../../../../types/shared/types";
import { GAME } from "../../../../types/shared/constants";
import styles from "./game.module.css";

interface GameSettingsModalProps {
  show: boolean;
  settings: GameSettings;
  onSettingsChange: (settings: GameSettings) => void;
  onConfirm: () => void;
}

const GameSettingsModal = ({ show, settings, onSettingsChange, onConfirm }: GameSettingsModalProps) => {
  if (!show) return null;

  const handleChange = (key: keyof GameSettings, value: number) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  return (
    <div className={styles.settingsOverlay}>
      <div className={styles.settingsModal}>
        <h2 className={styles.settingsTitle}>
          ゲーム内容を設定してください。
        </h2>

        <div className={styles.settingItem}>
          <label htmlFor="ballSpeed" className={styles.settingLabel}>
            スピード:
          </label>
          <select
            id="ballSpeed"
            value={settings.ballSpeed}
            onChange={(e) => handleChange("ballSpeed", parseInt(e.target.value))}
            className={styles.settingSelect}
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.settingItem}>
          <label htmlFor="winningScore" className={styles.settingLabel}>
            勝利得点:
          </label>
          <select
            id="winningScore"
            value={settings.winningScore}
            onChange={(e) => handleChange("winningScore", parseInt(e.target.value))}
            className={styles.settingSelect}
          >
            {GAME.WINNING_SCORE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <button onClick={onConfirm} className={styles.settingsButton}>
          OK
        </button>
      </div>
    </div>
  );
};

export default GameSettingsModal;
