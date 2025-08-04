// =============== MCTS节点类 ===============
function MCTSNode(board, move, parent, color) {
  this.board = window.copyBoard(board);
  this.move = move;
  this.parent = parent;
  this.color = color;
  this.children = [];
  this.wins = 0;
  this.visits = 0;
  
  if (move) this._applyMove();
}

MCTSNode.prototype._applyMove = function() {
  this.board[this.move.y][this.move.x] = this.color;
  const neighbors = window.getNeighbors(this.move.x, this.move.y, this.board.length);
  const opponent = 3 - this.color;
  
  // 提子逻辑
  for (let i = 0; i < neighbors.length; i++) {
    const [nx, ny] = neighbors[i];
    if (this.board[ny][nx] === opponent && 
        !window.AIEval.checkLiberties(this.board, nx, ny)) {
      this._removeGroup(nx, ny);
    }
  }
};

MCTSNode.prototype._removeGroup = function(x, y) {
  const color = this.board[y][x];
  const queue = [[x, y]];
  const size = this.board.length;
  
  while (queue.length > 0) {
    const [cx, cy] = queue.pop();
    this.board[cy][cx] = 0;
    
    const neighbors = window.getNeighbors(cx, cy, size);
    for (let i = 0; i < neighbors.length; i++) {
      const [nx, ny] = neighbors[i];
      if (this.board[ny][nx] === color) {
        queue.push([nx, ny]);
      }
    }
  }
};

// =============== MCTS核心方法 ===============
MCTSNode.prototype._selectChild = function(exploration) {
  let bestChild = null;
  let bestUCT = -Infinity;
  
  for (let i = 0; i < this.children.length; i++) {
    const child = this.children[i];
    const uct = child._getUCTValue(exploration);
    if (uct > bestUCT) {
      bestUCT = uct;
      bestChild = child;
    }
  }
  return bestChild;
};

MCTSNode.prototype._getUCTValue = function(c) {
  if (this.visits === 0) return Infinity;
  return (this.wins / this.visits) + c * Math.sqrt(Math.log(this.parent.visits) / this.visits);
};

MCTSNode.prototype._expand = function() {
  const validMoves = this._getValidMoves();
  const nextColor = 3 - this.color;
  
  for (let i = 0; i < validMoves.length; i++) {
    this.children.push(new MCTSNode(
      this.board,
      validMoves[i],
      this,
      nextColor
    ));
  }
  
  return this.children[0] || this; // 返回第一个子节点或自身
};

MCTSNode.prototype._getValidMoves = function() {
  const moves = [];
  for (let y = 0; y < this.board.length; y++) {
    for (let x = 0; x < this.board.length; x++) {
      if (this.board[y][x] === 0 && window.AIEval.isValidMove(this.board, x, y, this.color)) {
        moves.push({ x, y });
      }
    }
  }
  return moves;
};

MCTSNode.prototype._simulate = function() {
  let board = window.copyBoard(this.board);
  let currentColor = this.color;
  let passes = 0;
  let steps = 0;
  
  // 限制模拟步数（防止无限循环）
  while (passes < 2 && steps < 100) {
    const move = window.getRandomMove(board, currentColor);
    if (!move) {
      passes++;
    } else {
      board[move.y][move.x] = currentColor;
      passes = 0;
    }
    currentColor = 3 - currentColor;
    steps++;
  }
  
  return this._estimateResult(board);
};

MCTSNode.prototype._estimateResult = function(board) {
  let score = 0;
  const size = board.length;
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (board[y][x] === this.color) score++;
      else if (board[y][x] === 0) score += 0.5; // 简化评估
    }
  }
  
  return {
    winner: score > size * size / 2 ? this.color : 3 - this.color,
    score: Math.abs(score)
  };
};

MCTSNode.prototype._backpropagate = function(result) {
  let node = this;
  while (node) {
    node.visits++;
    if (node.color === result.winner) {
      node.wins += result.score;
    }
    node = node.parent;
  }
};

MCTSNode.prototype._getBestMove = function() {
  let bestMove = null;
  let bestVisits = -1;
  
  for (let i = 0; i < this.children.length; i++) {
    const child = this.children[i];
    if (child.visits > bestVisits) {
      bestVisits = child.visits;
      bestMove = child.move;
    }
  }
  
  return bestMove;
};

// 新增方法：增强型模拟
MCTSNode.prototype._enhancedSimulate = function() {
  let board = window.copyBoard(this.board);
  let currentColor = this.color;
  let passes = 0;
  
  // 限制60步且增加战术意识
  for (let steps = 0; steps < 60 && passes < 2; steps++) {
    const move = this._getTacticalMove(board, currentColor);
    if (!move) {
      passes++;
    } else {
      board[move.y][move.x] = currentColor;
      passes = 0;
    }
    currentColor = 3 - currentColor;
  }
  
  return this._estimateResult(board);
};

// 新增方法：战术走子生成
MCTSNode.prototype._getTacticalMove = function(board, color) {
  const candidates = [];
  const size = board.length;
  
  // 1. 优先吃子
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (board[y][x] === 0 && window.AIEval.isValidMove(board, x, y, color)) {
        const testBoard = window.copyBoard(board);
        testBoard[y][x] = color;
        
        // 检测是否能吃子
        const neighbors = window.getNeighbors(x, y, size);
        for (const [nx, ny] of neighbors) {
          if (board[ny][nx] === 3-color && 
              !window.AIEval.checkLiberties(testBoard, nx, ny)) {
            return {x, y}; // 直接返回吃子点
          }
        }
        
        candidates.push({x, y});
      }
    }
  }
  
  // 2. 加权随机选择
  return candidates.length > 0 
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : null;
};

// =============== 公开接口 ===============
window.MCTS = {
  search: function(board, color, config) {
    const startTime = Date.now();
    const root = new MCTSNode(board, null, null, color);
    let simulations = 0;
    const maxEmptySpaces = board.length * board.length;
    const emptySpaces = countEmptySpaces(board);
    
    // 动态调整模拟次数（基于棋盘剩余空间）
    const maxSimulations = Math.min(
      Math.floor(config.simulations * (1 + emptySpaces/maxEmptySpaces * 3)),
      2000 // 硬性上限
    );

    while (simulations < maxSimulations) {
      // 严格超时控制（保留3秒缓冲）
      if (Date.now() - startTime > config.timeout - 3000) {
        console.log(`超时预警: ${simulations}/${maxSimulations}次模拟`);
        break;
      }

      // 1. 选择阶段（带深度限制）
      let node = root;
      let depth = 0;
      while (node.children.length > 0 && depth < 100) {
        node = this._selectWithHeuristics(node, config.exploration);
        depth++;
      }

      // 2. 智能扩展（带缓存优化）
      if (node._shouldExpand()) {
        node = this._smartExpand(node);
      }

      // 3. 增强模拟（带战术策略）
      const result = this._enhancedSimulate(node, color);
      
      // 4. 回溯更新
      node._backpropagate(result);
      simulations++;
    }
    
    // 增强最终决策（考虑稳定性）
    const bestMove = this._getStableBestMove(root);
    return bestMove || this._getEmergencyMove(root.board, color);
  },

  // 带启发式的节点选择
  _selectWithHeuristics: function(node, c) {
    let bestChild = null;
    let bestScore = -Infinity;
    const boardSize = node.board.length;
    
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      let score = child._getUCTValue(c);
      
      // 中央区域加成（9x9棋盘示例）
      const {x, y} = child.move;
      const centerDist = Math.sqrt(
        Math.pow(x - boardSize/2, 2) + 
        Math.pow(y - boardSize/2, 2)
      );
      score += (boardSize - centerDist) * 0.03;
      
      // 胜利概率加成
      if (child.visits > 0) {
        score += (child.wins / child.visits) * 0.5;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestChild = child;
      }
    }
    return bestChild;
  },

  // 智能扩展（带移动优先级）
  _smartExpand: function(node) {
    const moves = this._getPrioritizedMoves(node.board, node.color);
    const nextColor = 3 - node.color;
    
    // 限制扩展数量（性能优化）
    const maxExpansion = Math.min(15, moves.length);
    for (let i = 0; i < maxExpansion; i++) {
      node.children.push(new MCTSNode(
        node.board,
        moves[i],
        node,
        nextColor
      ));
    }
    
    return node.children[0] || node;
  },

  // 走子优先级评估（优化版）
  _getPrioritizedMoves: function(board, color) {
    const moves = [];
    const size = board.length;
    const opponent = 3 - color;
    const center = size / 2;
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (board[y][x] !== 0 || !window.AIEval.isValidMove(board, x, y, color)) 
          continue;
          
        let priority = 0;
        const testBoard = window.copyBoard(board);
        testBoard[y][x] = color;
        const neighbors = window.getNeighbors(x, y, size);
        
        // 1. 吃子检测（最高优先级）
        neighbors.forEach(([nx, ny]) => {
          if (board[ny][nx] === opponent && 
              !window.AIEval.checkLiberties(testBoard, nx, ny)) {
            priority += 15; // 提高吃子权重
          }
        });
        
        // 2. 防守检测
        if (priority === 0) {
          neighbors.forEach(([nx, ny]) => {
            if (board[ny][nx] === color) {
              const libs = window.AIEval.countLiberties(board, nx, ny);
              if (libs === 1) priority += 8;  // 紧急救棋
              else if (libs === 2) priority += 3; // 潜在危险
            }
          });
        }
        
        // 3. 区域价值 + 棋形判断
        const centerDist = Math.sqrt(Math.pow(x-center, 2) + Math.pow(y-center, 2));
        priority += (size - centerDist) * 0.7; // 加强中央偏好
        
        // 4. 模式匹配（简单版）
        if (priority < 5) {
          if ((x === 3 || x === size-4) && (y === 3 || y === size-4)) {
            priority += 2; // 小目偏好
          }
        }
        
        if (priority > 0) {
          moves.push({x, y, priority});
        }
      }
    }
    
    // 按优先级排序并限制数量
    return moves.sort((a,b) => b.priority - a.priority)
               .slice(0, 25) // 稍增加候选数量
               .map(m => ({x: m.x, y: m.y}));
  },

  // 增强模拟（带基础战术）
  _enhancedSimulate: function(node) {
    let board = window.copyBoard(node.board);
    let currentColor = node.color;
    let passes = 0;
    
    for (let steps = 0; steps < 80 && passes < 2; steps++) {
      const move = this._getTacticalMove(board, currentColor);
      if (!move) {
        passes++;
      } else {
        board[move.y][move.x] = currentColor;
        passes = 0;
        
        // 简化提子逻辑
        window.getNeighbors(move.x, move.y, board.length).forEach(([nx, ny]) => {
          if (board[ny][nx] === 3-currentColor && 
              !window.AIEval.checkLiberties(board, nx, ny)) {
            board[ny][nx] = 0; // 直接提子
          }
        });
      }
      currentColor = 3 - currentColor;
    }
    
    return node._estimateResult(board);
  },

  // 战术走子生成
  _getTacticalMove: function(board, color) {
    const candidates = [];
    const size = board.length;
    
    // 快速扫描
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (board[y][x] !== 0 || !window.AIEval.isValidMove(board, x, y, color)) 
          continue;
          
        let priority = 0;
        const neighbors = window.getNeighbors(x, y, size);
        
        // 吃子机会检测
        neighbors.forEach(([nx, ny]) => {
          if (board[ny][nx] === 3-color) {
            const testBoard = window.copyBoard(board);
            testBoard[y][x] = color;
            if (!window.AIEval.checkLiberties(testBoard, nx, ny)) {
              priority += 10;
            }
          }
        });
        
        if (priority > 0) {
          candidates.push({x, y, priority});
        }
      }
    }
    
    // 优先吃子，否则随机
    if (candidates.length > 0) {
      candidates.sort((a,b) => b.priority - a.priority);
      return {x: candidates[0].x, y: candidates[0].y};
    }
    return window.getRandomMove(board, color);
  },

  // 稳定性优先的最佳走子选择
  _getStableBestMove: function(root) {
    if (root.children.length === 0) return null;
    
    // 选择访问量最高的前3个候选
    const topCandidates = root.children
      .slice() // 复制数组
      .sort((a,b) => b.visits - a.visits)
      .slice(0, 3);
    
    // 选择胜率最高的（至少需要50次访问）
    const reliable = topCandidates.filter(c => c.visits >= 50);
    if (reliable.length > 0) {
      return reliable.reduce((best, curr) => 
        (curr.wins/curr.visits > best.wins/best.visits) ? curr : best
      ).move;
    }
    
    // 回退到访问量最高的
    return topCandidates[0].move;
  },

  // 紧急走子（当MCTS失效时）
  _getEmergencyMove: function(board, color) {
    // 尝试活棋/杀棋
    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board.length; x++) {
        if (board[y][x] === 0 && window.AIEval.isValidMove(board, x, y, color)) {
          const testBoard = window.copyBoard(board);
          testBoard[y][x] = color;
          
          // 活棋检测
          if (window.AIEval.countLiberties(testBoard, x, y) >= 2) {
            return {x, y};
          }
        }
      }
    }
    
    // 完全随机（最后手段）
    return window.getRandomMove(board, color);
  }
};

// 辅助函数（需在外部定义）
function countEmptySpaces(board) {
  let count = 0;
  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board.length; x++) {
      if (board[y][x] === 0) count++;
    }
  }
  return count;
}