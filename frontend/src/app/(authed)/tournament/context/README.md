# トーナメントコンテキストの使用方法

## 概要

トーナメント機能の状態管理を行うための Context API を使用したカスタムプロバイダーです。

## 主な機能

### 状態管理

- `tournamentState`: 現在のトーナメント画面の状態（lobby | waiting | bracket | result）
- `currentTournament`: 現在参加しているトーナメントのID

### 提供される関数

#### 基本的な状態変更

- `setTournamentState(state)`: トーナメント状態を直接設定
- `setCurrentTournament(id)`: 現在のトーナメントIDを設定

#### トーナメント操作

- `joinTournament(tournamentId)`: トーナメントに参加（待機室へ遷移）
- `leaveTournament()`: トーナメントから退出（ロビーへ戻る）

#### 画面遷移

- `goToLobby()`: ロビー画面へ遷移
- `goToWaitingRoom()`: 待機室へ遷移
- `goToBracket()`: ブラケット画面へ遷移
- `goToResult()`: 結果画面へ遷移

## 使用例

### 子コンポーネントでの使用

```typescript
import { useTournament } from "../context/TournamentContext";

export function MyComponent() {
  const {
    tournamentState,
    joinTournament,
    leaveTournament
  } = useTournament();

  const handleJoin = () => {
    joinTournament(123); // トーナメントID 123 に参加
  };

  const handleLeave = () => {
    leaveTournament(); // トーナメントから退出
  };

  return (
    <div>
      <p>現在の状態: {tournamentState}</p>
      <button onClick={handleJoin}>参加</button>
      <button onClick={handleLeave}>退出</button>
    </div>
  );
}
```

## 注意事項

- `useTournament()` フックは必ず `TournamentProvider` の内部で使用してください
- プロバイダーの外で使用するとエラーが発生します
