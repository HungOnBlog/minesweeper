import { IMinesweeperDrawer } from '../interfaces/drawer.interface';
import { IGame } from '../interfaces/game.interface';

export class MinesweeperGame implements IGame {
  private board: number[][] = [];
  private numberOfMines: number = 10; // Default is easy mode (9x9, 10 mines)
  private boardRows: number = 9;
  private boardCols: number = 9;
  private openedCells: number[][] = []; // Present position of opened cells
  private cursor: number[] = [0, 0]; // Present position of the cursor
  private flaggedCells: number[][] = []; // Present position of flagged cells
  private prompt = require('prompt-sync')();
  private startTimestamp: number = 0;
  private REDRAW_TIMESTAMP_INTERVAL_MS = 1000;
  private timeLoopInterval: any;

  private LOGO = `
        __  __ _                                                   
        |  \/  (_)                                                  
        | \  / |_ _ __   ___  _____      _____  ___ _ __   ___ _ __ 
        | |\/| | | '_ \ / _ \/ __\ \ /\ / / _ \/ _ \ '_ \ / _ \ '__|
        | |  | | | | | |  __/\__ \\ V  V /  __/  __/ |_) |  __/ |   
        |_|  |_|_|_| |_|\___||___/ \_/\_/ \___|\___| .__/ \___|_|   
                                                    | |              
                                                    |_|              
  `;

  constructor(private drawer: IMinesweeperDrawer) {}

  /**
   * Generate a new board, full of zeros.
   * @param rows
   * @param cols
   */
  private genEmptyBoard(rows: number, cols: number): number[][] {
    const emptyBoard = new Array(rows).map(() => new Array(cols).fill(0));
    return emptyBoard;
  }

  /**
   * Return list of valid neighbors of a cell. (8 neighbors)
   * @param row
   * @param col
   * @param boardRows
   * @param boardCols
   */
  private getNeighbors(
    row: number,
    col: number,
    boardRows: number,
    boardCols: number,
  ): number[][] {
    const neighbors = [];
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        if (row + i < 0 || row + i >= boardRows) continue;
        if (col + j < 0 || col + j >= boardCols) continue;
        neighbors.push([row + i, col + j]);
      }
    }
    return neighbors;
  }

  /**
   * Count the number of around mines of a cell. The mines are represented by -1.
   * @param row
   * @param col
   * @returns
   */
  private countMinesAroundCell(
    row: number,
    col: number,
    boardRows: number,
    boardCols: number,
  ): number {
    const neighbors = this.getNeighbors(row, col, boardRows, boardCols);
    let count = 0;
    for (const [i, j] of neighbors) {
      if (this.board[i][j] === -1) count++;
    }
    return count;
  }

  /**
   * Randomly generate mines on the board.
   * @param emptyBoard
   * @param numberOfMines
   * @returns
   */
  private placeMines(
    emptyBoard: number[][],
    numberOfMines: number,
  ): number[][] {
    const board = emptyBoard;
    const boardRows = board.length;
    const boardCols = board[0].length;
    let minesPlaced = 0;
    while (minesPlaced < numberOfMines) {
      const row = Math.floor(Math.random() * boardRows);
      const col = Math.floor(Math.random() * boardCols);
      if (board[row][col] === 0) {
        board[row][col] = -1;
        minesPlaced++;
      }
    }
    return board;
  }

  /**
   * Place number on remaining cells. The number represents the number of mines around the cell.
   * @param boardWithMines
   * @returns
   */
  private numericBoard(boardWithMines: number[][]): number[][] {
    const boardRows = boardWithMines.length;
    const boardCols = boardWithMines[0].length;
    const numericBoard = boardWithMines.map((row, i) =>
      row.map((col, j) => {
        if (col === -1) return -1;
        return this.countMinesAroundCell(i, j, boardRows, boardCols);
      }),
    );
    return numericBoard;
  }

  /**
   * Ask the user to choose the difficulty level.
   * @returns [mines, rows, cols]
   */
  selectLevel(): [number, number, number] {
    console.log('Select difficulty level:');
    console.log('1. Easy 9x9 with 10 mines');
    console.log('2. Medium 16x16 with 40 mines');
    console.log('3. Hard 16x30 with 99 mines');
    const difficulty = parseInt(this.prompt('Choose a difficulty level: '));
    if (isNaN(difficulty)) {
      console.log('Invalid difficulty');
      return this.selectLevel();
    }

    switch (difficulty) {
      case 1:
        return [10, 9, 9];
      case 2:
        return [40, 16, 16];
      case 3:
        return [99, 16, 30];
      default:
        console.log('Invalid difficulty, please try again');
        return this.selectLevel();
    }
  }

  /**
   * Loop to draw time by interval.
   */
  private timeLoop() {
    this.drawer.draw(
      this.getCurrentSeconds(),
      this.board,
      this.openedCells,
      this.flaggedCells,
      this.cursor,
    );
  }

  /**
   * If the cell is not opened and not flagged -> flag it.
   *
   * If the cell is not opened and flagged -> un-flag it.
   * @param x
   * @param y
   */
  private toggleFlag(x: number, y: number) {
    const isThisCellOpened = this.openedCells.some(
      (cell) => cell[0] === x && cell[1] === y,
    );
    if (isThisCellOpened) return;

    const index = this.flaggedCells.findIndex(([i, j]) => i === x && j === y);
    if (index === -1) {
      this.flaggedCells.push([x, y]);
    } else {
      this.flaggedCells.splice(index, 1);
    }
  }

  /**
   * Use flood fill algorithm to open all cells around a cell.
   *
   * If the cell is a mine, the game is over.
   * @param x
   * @param y
   */
  private openCell(x: number, y: number) {
    const isThisCellOpened = this.openedCells.some(
      (cell) => cell[0] === x && cell[1] === y,
    );
    if (isThisCellOpened) return;

    const isThisCellFlagged = this.flaggedCells.some(
      (cell) => cell[0] === x && cell[1] === y,
    );
    if (isThisCellFlagged) return;

    if (this.board[x][y] === -1) {
      this.drawer.drawLost(this.getCurrentSeconds(), this.board);
      clearInterval(this.timeLoopInterval);
      this.stop();
    }

    this.openedCells.push([x, y]);

    if (this.board[x][y] === 0) {
      const neighbors = this.getNeighbors(x, y, this.boardRows, this.boardCols);
      for (const [i, j] of neighbors) {
        this.openCell(i, j);
      }
    }
  }

  private checkWin() {
    const numberOfCells = this.boardRows * this.boardCols;
    const numberOfOpenedCells = this.openedCells.length;
    const numberOfFlaggedCells = this.flaggedCells.length;
    const numberOfMines = this.numberOfMines;

    if (
      numberOfOpenedCells + numberOfFlaggedCells === numberOfCells &&
      numberOfFlaggedCells === numberOfMines
    ) {
      this.drawer.drawWon(
        this.getCurrentSeconds(),
        this.board,
        this.openedCells,
        this.flaggedCells,
      );
      clearInterval(this.timeLoopInterval);
      this.stop();
    }
  }

  /**
   * Get current seconds from start.
   * @returns
   */
  private getCurrentSeconds(): number {
    const now = Date.now();
    const ms = now - this.startTimestamp;
    const secs = Math.floor(ms / 1000);
    return secs;
  }

  /**
   * Main game loop.
   *
   * Game play:
   *
   * - Use ⬅️ ⬆️ ⬇️ ➡️ to move the cursor.
   *
   * - Use 'f' to flag a cell or un-flag a cell.
   *
   * - Use 'space' to open a cell.
   *
   * - Use 'ctrl+c' to exit.
   */
  private loop() {
    this.timeLoopInterval = setInterval(() => {
      this.timeLoop();
    }, this.REDRAW_TIMESTAMP_INTERVAL_MS);

    const readline = require('readline');
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    process.stdin.on('keypress', (str, key) => {
      if (key.ctrl && key.name === 'c') {
        process.exit();
      }
      if (key.name === 'left') {
        this.cursor[1]--;
      } else if (key.name === 'right') {
        this.cursor[1]++;
      } else if (key.name === 'up') {
        this.cursor[0]--;
      } else if (key.name === 'down') {
        this.cursor[0]++;
      } else if (key.name === 'f') {
        const [row, col] = this.cursor;
        this.toggleFlag(row, col);
      } else if (key.name === 'space') {
        const [row, col] = this.cursor;
        this.openCell(row, col);
      }

      this.cursor[0] = Math.max(0, this.cursor[0]);
      this.cursor[0] = Math.min(this.board.length - 1, this.cursor[0]);
      this.cursor[1] = Math.max(0, this.cursor[1]);
      this.cursor[1] = Math.min(this.board[0].length - 1, this.cursor[1]);

      this.drawer.draw(
        this.getCurrentSeconds(),
        this.board,
        this.openedCells,
        this.flaggedCells,
        this.cursor,
      );
      this.checkWin();
      this.drawer.drawRemainingFlags(
        this.numberOfMines - this.flaggedCells.length,
      );
    });
  }

  /**
   * Initialize the game board.
   * @param boardRows
   * @param boardCols
   */
  private initializeBoard(boardRows: number, boardCols: number): void {
    this.board = this.genEmptyBoard(boardRows, boardCols);
    this.board = this.placeMines(this.board, this.numberOfMines);
    this.board = this.numericBoard(this.board);
  }

  name(): string {
    return 'Minesweeper';
  }

  start(): void {
    console.log(this.LOGO);
    [this.numberOfMines, this.boardRows, this.boardCols] = this.selectLevel();
    this.initializeBoard(this.boardRows, this.boardCols);
    this.loop();
  }

  stop(): void {
    process.exit(0);
  }

  restart(): void {
    throw new Error('Method not implemented.');
  }
}
