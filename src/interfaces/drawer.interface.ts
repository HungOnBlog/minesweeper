export interface IMinesweeperDrawer {
  draw(
    seconds: number,
    board: number[][],
    opened: number[][],
    flags: number[][],
    cursor: number[],
  ): void;

  drawLost(seconds: number, board: number[][]): void;

  drawWon(
    seconds: number,
    board: number[][],
    opened: number[][],
    flags: number[][],
  ): void;

  drawRemainingFlags(remainingFlags: number): void;
}
