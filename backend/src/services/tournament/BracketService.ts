import type {
  BracketMatch,
  BracketGenerationResult,
  TournamentParticipant,
} from "../../types/tournament";
import { v4 as uuidv4 } from "uuid";

export class BracketService {
  /**
   * トーナメントブラケットを生成する
   * @param participants 参加者一覧
   * @param tournamentId トーナメントID
   * @returns ブラケット生成結果
   */
  public generateBracket(
    participants: TournamentParticipant[],
    tournamentId: string
  ): BracketGenerationResult {
    const participantCount = participants.length;

    // 参加者が2未満の場合はエラー
    if (participantCount < 2) {
      throw new Error("トーナメントには最低2名の参加者が必要です");
    }

    // 参加者をランダムシャッフル
    const shuffledParticipants = this.shuffleArray([...participants]);

    // 2のべき乗に調整するための計算
    const powerOfTwo = this.getNextPowerOfTwo(participantCount);
    const byeCount = powerOfTwo - participantCount;

    // 総ラウンド数を計算
    const totalRounds = Math.log2(powerOfTwo);

    // 各ラウンドの試合を生成
    const matches = this.generateMatches(
      shuffledParticipants,
      tournamentId,
      totalRounds,
      byeCount
    );

    return {
      matches,
      totalRounds,
      participantCount,
    };
  }

  /**
   * 配列をランダムシャッフルする
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * 指定した数以上の最小の2のべき乗を取得
   */
  private getNextPowerOfTwo(num: number): number {
    return Math.pow(2, Math.ceil(Math.log2(num)));
  }

  /**
   * 全ラウンドの試合を生成
   */
  private generateMatches(
    participants: TournamentParticipant[],
    tournamentId: string,
    totalRounds: number,
    byeCount: number
  ): BracketMatch[] {
    const matches: BracketMatch[] = [];
    let currentRound = 1;

    // 1回戦の試合を生成
    const firstRoundMatches = this.generateFirstRoundMatches(
      participants,
      tournamentId,
      byeCount
    );
    matches.push(...firstRoundMatches);

    // 2回戦以降の空の試合スロットを生成
    for (let round = 2; round <= totalRounds; round++) {
      const roundMatches = this.generateEmptyRoundMatches(
        tournamentId,
        round,
        Math.pow(2, totalRounds - round)
      );
      matches.push(...roundMatches);
    }

    return matches;
  }

  /**
   * 1回戦の試合を生成（bye考慮）
   */
  private generateFirstRoundMatches(
    participants: TournamentParticipant[],
    tournamentId: string,
    byeCount: number
  ): BracketMatch[] {
    const matches: BracketMatch[] = [];
    const participantList = [...participants];
    let matchNumber = 1;

    // bye を持つ参加者の処理（奇数人数対応）
    const playersWithBye = participantList.splice(0, byeCount);

    // 実際に対戦する参加者をペアにする
    while (participantList.length >= 2) {
      const player1 = participantList.shift()!;
      const player2 = participantList.shift()!;

      matches.push({
        id: uuidv4(),
        tournamentId,
        round: 1,
        matchNumber: matchNumber++,
        player1Id: player1.userId,
        player2Id: player2.userId,
        player1Name: player1.userName,
        player2Name: player2.userName,
        status: "pending",
        createdAt: Date.now(),
      });
    }

    // bye を持つ参加者用の自動勝利試合
    playersWithBye.forEach((player) => {
      matches.push({
        id: uuidv4(),
        tournamentId,
        round: 1,
        matchNumber: matchNumber++,
        player1Id: player.userId,
        player2Id: undefined, // bye
        player1Name: player.userName,
        player2Name: undefined,
        status: "completed",
        winnerId: player.userId,
        createdAt: Date.now(),
      });
    });

    return matches;
  }

  /**
   * 2回戦以降の空の試合スロットを生成
   */
  private generateEmptyRoundMatches(
    tournamentId: string,
    round: number,
    matchCount: number
  ): BracketMatch[] {
    const matches: BracketMatch[] = [];

    for (let i = 1; i <= matchCount; i++) {
      matches.push({
        id: uuidv4(),
        tournamentId,
        round,
        matchNumber: i,
        player1Id: undefined,
        player2Id: undefined,
        player1Name: undefined,
        player2Name: undefined,
        status: "pending",
        createdAt: Date.now(),
      });
    }

    return matches;
  }

  /**
   * 試合結果を受けて次のラウンドの試合を更新
   */
  public updateBracketAfterMatch(
    matches: BracketMatch[],
    completedMatch: BracketMatch,
    winnerId: string,
    winnerName: string
  ): BracketMatch[] {
    const updatedMatches = matches.map((match) => {
      if (match.id === completedMatch.id) {
        return {
          ...match,
          status: "completed" as const,
          winnerId,
        };
      }
      return match;
    });

    // 次のラウンドの試合を更新
    this.updateNextRoundMatch(
      updatedMatches,
      completedMatch,
      winnerId,
      winnerName
    );

    return updatedMatches;
  }

  /**
   * 次のラウンドの該当試合に勝者を配置
   */
  private updateNextRoundMatch(
    matches: BracketMatch[],
    completedMatch: BracketMatch,
    winnerId: string,
    winnerName: string
  ): void {
    const nextRound = completedMatch.round + 1;
    const nextMatchNumber = Math.ceil(completedMatch.matchNumber / 2);

    const nextMatch = matches.find(
      (match) =>
        match.round === nextRound && match.matchNumber === nextMatchNumber
    );

    if (!nextMatch) return;

    // 奇数番号の試合の勝者は次のラウンドのplayer1、偶数番号の試合の勝者はplayer2
    if (completedMatch.matchNumber % 2 === 1) {
      nextMatch.player1Id = winnerId;
      nextMatch.player1Name = winnerName;
    } else {
      nextMatch.player2Id = winnerId;
      nextMatch.player2Name = winnerName;
    }

    // 両方のプレイヤーが決まったら試合を開始可能にする
    if (nextMatch.player1Id && nextMatch.player2Id) {
      nextMatch.status = "pending";
    }
  }

  /**
   * ブラケットからファイナリストを取得
   */
  public getFinalist(matches: BracketMatch[]): string | null {
    // 最終ラウンドの完了した試合を探す
    const maxRound = Math.max(...matches.map((match) => match.round));
    const finalMatch = matches.find(
      (match) => match.round === maxRound && match.status === "completed"
    );

    return finalMatch?.winnerId || null;
  }

  /**
   * 次に開始可能な試合を取得
   */
  public getNextAvailableMatches(matches: BracketMatch[]): BracketMatch[] {
    return matches.filter(
      (match) =>
        match.status === "pending" &&
        match.player1Id &&
        match.player2Id &&
        !match.gameRoomId
    );
  }

  /**
   * 現在のラウンドを取得
   */
  public getCurrentRound(matches: BracketMatch[]): number {
    const pendingMatches = matches.filter((match) => match.status === "pending");
    if (pendingMatches.length === 0) {
      return Math.max(...matches.map((match) => match.round));
    }
    return Math.min(...pendingMatches.map((match) => match.round));
  }
}
