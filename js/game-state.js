//game-state.js

// 游戏初始状态
const defaultSize = 9; // 支持 9, 13, 19

window.game = {
  boardSize: defaultSize,
  currentPlayer: 'black',
  passCount: 0,
  previousBoard: null,
  board: Array.from({ length: defaultSize }, () => Array(defaultSize).fill(0)),
  playerColor: null
};

// 玩家颜色由连接逻辑设置
window.game.playerColor = null;