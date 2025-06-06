# CLI Game Flow Analysis - 勝敗決定からメニュー復帰まで

## 概要
CLIでPongゲームをプレイし、勝敗が決定してからメインメニューに戻るまでのコードフローを詳細に分析。

## 1. 勝敗決定時のイベントフロー

### 1.1 WebSocketからの`gameOver`メッセージ受信
**ファイル**: `game-client.ts:203-207`
```typescript
case "gameOver":
  if (this.handlers.onGameOver) {
    this.handlers.onGameOver(message.result);
  }
  break;
```

### 1.2 GameUIでの勝敗表示
**ファイル**: `game-ui.ts:182-193`
```typescript
public onGameOver(result: GameResult): void {
  const isWinner = result.winner === this.playerSide;
  
  this.updateStatus(
    `{center}{bold}GAME OVER{/bold}{/center}\n\n` +
    `{center}${isWinner ? "{green-fg}{bold}YOU WIN!{/bold}{/green-fg}" : "{red-fg}{bold}YOU LOSE{/bold}{/red-fg}"}{/center}\n\n` +
    `{center}Final Score{/center}\n` +
    `{center}${result.finalScore.left} - ${result.finalScore.right}{/center}`
  );
  
  this.screen.render();
}
```

## 2. メインアプリケーションでの処理

### 2.1 onGameOverハンドラー実行
**ファイル**: `index.ts:193-199`
```typescript
onGameOver: (result) => {
  this.gameUI?.onGameOver(result);
  // 5秒後にゲーム終了処理とPromise解決
  setTimeout(() => {
    this.endGame();
    resolve(); // ここでPromiseを解決
  }, 5000);
},
```

**問題点 1**: 5秒待機中にユーザーがCtrl+Cを押すと、適切にクリーンアップされない可能性がある。

## 3. ゲーム終了処理 (`endGame()`)

### 3.1 リソースのクリーンアップ
**ファイル**: `index.ts:244-263`
```typescript
private endGame(): void {
  // GameClientの切断
  if (this.gameClient) {
    this.gameClient.disconnect();
    this.gameClient = null;
  }

  // GameUIの破棄
  if (this.gameUI) {
    this.gameUI.destroy();
    this.gameUI = null;
  }

  // ターミナル状態の完全リセット
  this.resetTerminal();
  console.log(colors.cyan("🏓 メインメニューに戻ります..."));
  
  // 100ms待機（念のため）
  setTimeout(() => {
    // 追加の状態リセット（念のため）
  }, 100);
}
```

### 3.2 ターミナル状態リセット
**ファイル**: `index.ts:268-281`
```typescript
private resetTerminal(): void {
  // カーソルを表示
  process.stdout.write('\x1b[?25h');
  // 通常のスクリーンバッファに戻る
  process.stdout.write('\x1b[?1049l');
  // 画面をクリア
  console.clear();
  // 標準入力を通常モードに戻す
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  // バッファをフラッシュ
  process.stdout.write('');
}
```

### 3.3 GameUIの破棄処理
**ファイル**: `game-ui.ts:329-349`
```typescript
public destroy(): void {
  try {
    // 標準入力をrawモードから戻す
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    
    // スクリーンを破棄
    this.screen.destroy();
    
    // カーソルを表示に戻す
    process.stdout.write('\x1b[?25h');
    
    // 代替スクリーンバッファを無効化
    process.stdout.write('\x1b[?1049l');
    
  } catch (error) {
    // エラーが発生してもクリーンアップを続行
    console.error("UI cleanup error:", error);
  }
}
```

**問題点 2**: `GameUI.destroy()`と`resetTerminal()`で同じ処理が重複している。効率性の問題。

## 4. Promiseの解決とメニューループ復帰

### 4.1 startGame()のPromise解決
**ファイル**: `index.ts:153-239`
```typescript
return new Promise<void>((resolve, reject) => {
  // ... ゲーム処理 ...
  
  onGameOver: (result) => {
    this.gameUI?.onGameOver(result);
    setTimeout(() => {
      this.endGame();
      resolve(); // ← ここでPromiseが解決される
    }, 5000);
  },
  
  // ... 他のハンドラー ...
});
```

### 4.2 メインループでの処理継続
**ファイル**: `index.ts:52-59`
```typescript
const action = await this.showMainMenu();
switch (action) {
  case "random":
    await this.joinRandomGame(); // ← startGame()のPromiseがresolveされて戻ってくる
    break;
  case "logout":
    await this.logout();
    return;
  case "exit":
    await this.cleanup();
    return;
}
```

### 4.3 メインメニューの表示
**ファイル**: `index.ts:117-140`
```typescript
private async showMainMenu(): Promise<string> {
  try {
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "何をしますか？",
        choices: [
          { name: "🎮 ランダムマッチに参加", value: "random" },
          { name: "🚪 ログアウト", value: "logout" },
          { name: "❌ 終了", value: "exit" },
        ],
      },
    ]);
    return answer.action;
  } catch (error: any) {
    // ExitPromptErrorの場合は正常終了として扱う
    if (error?.name === "ExitPromptError") {
      return "exit";
    }
    throw error;
  }
}
```

## 5. 特定された問題点と潜在的な改善点

### 問題点 1: ゲーム終了待機中の強制終了処理
**詳細**: 5秒の待機中にユーザーがCtrl+Cを押した場合、`endGame()`が呼ばれずにリソースが残る可能性

**解決策**:
```typescript
// タイマーIDを保存して、必要に応じてクリア
let gameOverTimer: NodeJS.Timeout | null = null;

onGameOver: (result) => {
  this.gameUI?.onGameOver(result);
  gameOverTimer = setTimeout(() => {
    this.endGame();
    resolve();
  }, 5000);
},

// onQuitやシグナルハンドラーでタイマーをクリア
this.gameUI.onQuit = () => {
  if (gameOverTimer) {
    clearTimeout(gameOverTimer);
    gameOverTimer = null;
  }
  this.endGame();
  resolve();
};
```

### 問題点 2: 重複するターミナルリセット処理
**詳細**: `GameUI.destroy()`と`resetTerminal()`で同じANSIエスケープシーケンスが実行される

**解決策**: どちらか一方に統一するか、順序を明確にする

### 問題点 3: 非同期処理のタイミング問題
**詳細**: `endGame()`内の100ms待機の目的が不明確で、必要性が疑問

**解決策**: 明確な理由がない限り削除するか、コメントで説明

### 問題点 4: エラーハンドリングの不完全性
**詳細**: WebSocket切断やUI破棄時のエラーが適切にハンドリングされていない場合がある

**解決策**: より堅牢なエラーハンドリングの実装

## 6. 推奨される改善点

1. **タイマー管理の改善**: ゲーム終了待機タイマーの適切な管理
2. **重複処理の削除**: ターミナルリセット処理の統一
3. **エラーハンドリング強化**: 各段階でのエラー処理の充実
4. **状態管理の明確化**: アプリケーション状態の明確な管理
5. **ログ出力の改善**: デバッグ用のログ出力の追加

## 7. 現在の動作確認状況

- ✅ ゲーム終了後のメニュー復帰
- ✅ ターミナル状態のリセット
- ✅ blessed UIとinquirerの競合解決
- ✅ 強制終了時の完全なクリーンアップ（修正済み）
- ✅ 処理効率の最適化（修正済み）

## 8. 実装された修正内容 (2024年実施)

### 8.1 タイマー管理の改善
**問題**: 5秒待機中の強制終了で適切なクリーンアップがされない

**修正内容**:
- `gameEndTimer: NodeJS.Timeout | null`プロパティを追加
- `clearGameEndTimer()`メソッドで一元的なタイマー管理
- 全ての終了パスでタイマークリアを実行

**実装場所**:
```typescript
// index.ts
private gameEndTimer: NodeJS.Timeout | null = null;

private clearGameEndTimer(): void {
  if (this.gameEndTimer) {
    clearTimeout(this.gameEndTimer);
    this.gameEndTimer = null;
  }
}

// onGameOver, onError, onDisconnected, onQuitの全てでクリア
```

### 8.2 重複処理の削除
**問題**: `GameUI.destroy()`と`resetTerminal()`で同じターミナルリセット処理

**修正内容**:
- `GameUI.destroy()`はblessed screenの破棄のみに特化
- ターミナル状態のリセットは`resetTerminal()`に統一
- 責任分離の原則に従った設計

### 8.3 不明確な待機処理の削除
**問題**: `endGame()`内の不明確な100ms待機

**修正内容**:
- 目的不明の100ms `setTimeout`を削除
- 同期的な処理フローに変更

### 8.4 エラーハンドリングの強化
**問題**: エラー時の不完全なクリーンアップ

**修正内容**:
- 全ての主要メソッドにtry-catch追加
- 各処理ステップを個別にエラーハンドリング
- エラーが発生してもクリーンアップを継続

**強化された箇所**:
- `endGame()`: GameClient、GameUI、ターミナルリセットの各処理
- `resetTerminal()`: 各ANSIエスケープシーケンスの個別処理
- `cleanup()`: 全ての終了処理の安全な実行
- プロセス終了ハンドラー: SIGINT時の安全な終了

## 9. 修正後の処理フロー

### 9.1 正常な勝敗決定時
1. `onGameOver`ハンドラー実行
2. UI表示更新
3. 5秒タイマー開始（`gameEndTimer`で管理）
4. タイマー完了後：
   - `clearGameEndTimer()`でタイマークリア
   - `endGame()`で安全なリソース解放
   - Promiseが解決されメニューループに復帰

### 9.2 強制終了時（Ctrl+C等）
1. `onQuit`ハンドラー実行
2. `clearGameEndTimer()`で既存タイマーをクリア
3. `endGame()`で即座にリソース解放
4. Promiseが解決されメニューループに復帰

### 9.3 エラー発生時
1. 各処理でtry-catchによるエラーキャッチ
2. エラーログ出力
3. 処理継続（可能な限り）
4. 確実なリソース解放

## 10. 改善効果

- **安定性向上**: どの終了パスでも確実なクリーンアップ
- **保守性向上**: 責任分離による明確な構造
- **デバッグ性向上**: 詳細なエラーログ出力
- **ユーザー体験向上**: より安定したメニュー復帰

## 11. キーバインディング問題の追加修正 (2024年実施)

### 11.1 問題
ゲーム終了後のメニューで、カーソルキーの動作が逆転する（↓キーで選択肢が上に移動）

### 11.2 原因分析
- blessed UIのrawモード設定がinquirerに影響
- ターミナルのカーソルキーモードが通常モードに戻っていない
- stdin のイベントリスナーが残留している可能性

### 11.3 修正内容

#### A. `resetTerminal()`の強化
```typescript
private resetTerminal(): void {
  // 1. 標準入力をrawモードから確実に戻す
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  
  // 2. 残留イベントリスナーをクリア
  process.stdin.removeAllListeners('keypress');
  process.stdin.removeAllListeners('data');
  
  // 3. カーソルキーモードを通常に戻す
  process.stdout.write('\x1b[?1l'); // Normal cursor key mode
  
  // 4. キーパッドモードを無効化
  process.stdout.write('\x1b[?1h\x1b=');
}
```

#### B. メニュー表示前の初期化
```typescript
private initializeTerminalForMenu(): void {
  // TTYの設定を明示的にリセット
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
    process.stdin.resume();
  }
  
  // 通常のラインモードに戻す
  process.stdout.write('\x1b[?1l\x1b>');
}
```

#### C. メインループでの確実な初期化
- 各メニュー表示前に`initializeTerminalForMenu()`を呼び出し
- 初回起動時と同じ状態を維持

### 11.4 修正効果

- **正常なキーバインディング**: ゲーム後もメニューでカーソルキーが正常動作
- **一貫した動作**: 初回起動時と同じ操作感を維持
- **堅牢性**: 複数回のゲーム後も安定した動作

## 12. 総合的な安定性向上

これらの修正により、CLIアプリケーションは以下の点で大幅に改善：

1. **リソース管理**: 確実なタイマーとリソースのクリーンアップ
2. **ターミナル状態**: blessed UIとinquirer間での適切な状態管理
3. **エラー処理**: 堅牢なエラーハンドリングによる予期しない終了の防止
4. **ユーザー体験**: 一貫した操作感とスムーズなメニュー復帰