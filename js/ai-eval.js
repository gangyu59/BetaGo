// =============== 气检测 ===============
window.AIEval = {
  // 检查落子是否合法
  isValidMove: function(board, x, y, color) {
    if (board[y][x] !== 0) return false;
    
    // 临时落子检测
    const testBoard = window.copyBoard(board);
    testBoard[y][x] = color;
    
    // 1. 检查是否有气
    if (this.countLiberties(testBoard, x, y) > 0) return true;
    
    // 2. 检查是否可以提子
    const opponent = 3 - color;
    const neighbors = window.getNeighbors(x, y, board.length);
    for (const [nx, ny] of neighbors) {
      if (board[ny][nx] === opponent && 
          !this.checkLiberties(testBoard, nx, ny)) {
        return true;
      }
    }
    
    return false;
  },

  // 计算气
  countLiberties: function(board, x, y) {
    const color = board[y][x];
    const visited = new Set();
    const queue = [[x, y]];
    let liberties = 0;
    
    while (queue.length > 0 && liberties < 4) { // 优化：最多检测4口气
      const [cx, cy] = queue.pop();
      const key = `${cx},${cy}`;
      if (visited.has(key)) continue;
      visited.add(key);
      
      window.getNeighbors(cx, cy, board.length).forEach(([nx, ny]) => {
        if (board[ny][nx] === 0) liberties++;
        else if (board[ny][nx] === color) queue.push([nx, ny]);
      });
    }
    return liberties;
  },

  // 检查是否有气
  checkLiberties: function(board, x, y) {
    return this.countLiberties(board, x, y) > 0;
  },

  // 增强的胜负评估
  estimateResult: function(board, color) {
    let score = 0;
    const size = board.length;
    const opponent = 3 - color;
    const visited = new Set();
    
    // 精确数子+空点评估
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const key = `${x},${y}`;
        if (visited.has(key)) continue;
        
        if (board[y][x] === color) {
          score += 1;
        } else if (board[y][x] === opponent) {
          score -= 1;
        } else {
          // 空点归属判断
          const area = this._evaluateArea(board, x, y, visited);
          score += area === color ? 1 : area === opponent ? -1 : 0.5;
        }
      }
    }
    
    return {
      winner: score > 0 ? color : opponent,
      score: Math.abs(score)
    };
  },

  // 空点归属评估
  _evaluateArea: function(board, x, y, visited) {
    // 实现更精确的势力范围评估
    // ...（具体实现可根据需求补充）
  }
};