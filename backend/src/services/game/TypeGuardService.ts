import type {
  GameMessage,
  ChatMessage,
  PaddleMoveMessage,
  SurrenderMessage,
  GameSettingsMessage,
} from "../../types/message";

export class TypeGuardService {
  /**
   * 型ガード: ChatMessage
   */
  public isChatMessage(message: Partial<GameMessage>): message is ChatMessage {
    return (
      message.type === "chat" &&
      typeof (message as ChatMessage).name === "string" &&
      typeof (message as ChatMessage).message === "string"
    );
  }

  /**
   * 型ガード: PaddleMoveMessage
   */
  public isPaddleMoveMessage(
    message: Partial<GameMessage>
  ): message is PaddleMoveMessage {
    return (
      message.type === "paddleMove" &&
      typeof (message as PaddleMoveMessage).y === "number"
    );
  }

  /**
   * 型ガード: SurrenderMessage
   */
  public isSurrenderMessage(
    message: Partial<GameMessage>
  ): message is SurrenderMessage {
    return message.type === "surrender";
  }

  /**
   * 型ガード: GameSettingsMessage
   */
  public isGameSettingsMessage(
    message: Partial<GameMessage>
  ): message is GameSettingsMessage {
    return (
      message.type === "gameSettings" &&
      typeof (message as GameSettingsMessage).settings === "object" &&
      typeof (message as GameSettingsMessage).settings.ballSpeed === "number" &&
      typeof (message as GameSettingsMessage).settings.winningScore === "number"
    );
  }
}
