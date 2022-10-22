import { MinesweeperDrawer } from './implements/drawer';
import { MinesweeperGame } from './implements/game';

function main() {
  const game = new MinesweeperGame(new MinesweeperDrawer());
  game.start();
}

main();
