// 完整版AI围棋代码 - 替换你原来的全部AI相关代码
window.AIAgent = {
  getNextMove(board, color) {
    const size = board.length;
    
    // 1. 首先检查是否是开局阶段（前10手）
    const moveCount = this.countStones(board);
    if (moveCount < 10) {
      const openingMove = this.getOpeningMove(board, color, size);
      if (openingMove) return openingMove;
    }
    
    // 2. 非开局阶段使用常规策略
    return this.getStandardMove(board, color, size);
  },

  // =============== 开局策略 ===============
  getOpeningMove(board, color, size) {
    const strategies = [
      this.getCornerMove.bind(this),
      this.getApproachMove.bind(this),
      this.getExtensionMove.bind(this),
      this.getBalanceMove.bind(this)
    ];

    for (const strategy of strategies) {
      const move = strategy(board, color, size);
      if (move) return move;
    }
    return null;
  },

  // 占角策略（灵活点位）
  getCornerMove(board, color, size) {
    const cornerPoints = [
      [3, 3], [size-4, 3], [3, size-4], [size-4, size-4], // 小目
      [2, 2], [size-3, 2], [2, size-3], [size-3, size-3],  // 星位
      [3, 4], [4, 3], [size-4, 3], [3, size-4],            // 三三
      [4, 4], [size-5, 4], [4, size-5], [size-5, size-5]   // 目外
    ];

    const shuffledCorners = [...cornerPoints].sort(() => Math.random() - 0.5);
    
    for (const [x, y] of shuffledCorners) {
      if (board[y][x] === 0 && this.isValidMove(board, x, y, color)) {
        if (x > 1 && x < size-2 && y > 1 && y < size-2) {
          return { x, y };
        }
      }
    }
    return null;
  },

  // 挂角策略（靠近对方角部）
  getApproachMove(board, color, size) {
    const opponent = color === 1 ? 2 : 1;
    const approachDistance = size > 13 ? 3 : 2;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (board[y][x] === opponent && 
            (x < 4 || x > size-5) && (y < 4 || y > size-5)) {
          const approachPoints = [
            [x + approachDistance, y],
            [x - approachDistance, y],
            [x, y + approachDistance],
            [x, y - approachDistance]
          ].filter(([px, py]) => 
            px >= 0 && px < size && 
            py >= 0 && py < size &&
            board[py][px] === 0
          );

          if (approachPoints.length > 0) {
            const [ax, ay] = approachPoints[
              Math.floor(Math.random() * approachPoints.length)
            ];
            return { x: ax, y: ay };
          }
        }
      }
    }
    return null;
  },

  // 拆边策略（发展势力）
  getExtensionMove(board, color, size) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (board[y][x] === color && 
            (y === 2 || y === size-3 || x === 2 || x === size-3)) {
          const extensions = [
            [x + 2, y], [x - 2, y], [x, y + 2], [x, y - 2]
          ].filter(([px, py]) => 
            px >= 2 && px < size-2 && 
            py >= 2 && py < size-2 &&
            board[py][px] === 0
          );

          if (extensions.length > 0) {
            const [ex, ey] = extensions[
              Math.floor(Math.random() * extensions.length)
            ];
            return { x: ex, y: ey };
          }
        }
      }
    }
    return null;
  },

  // 分投策略（平衡发展）
  getBalanceMove(board, color, size) {
    const quadrantScores = Array(4).fill(0);
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (board[y][x] !== 0) {
          const quadrant = 
            (x < size/2 ? 0 : 1) + 
            (y < size/2 ? 0 : 2);
          quadrantScores[quadrant]++;
        }
      }
    }

    const minScore = Math.min(...quadrantScores);
    const targetQuadrant = quadrantScores.indexOf(minScore);
    
    const minX = targetQuadrant % 2 === 0 ? 2 : Math.ceil(size/2);
    const maxX = targetQuadrant % 2 === 0 ? Math.floor(size/2) : size-3;
    const minY = targetQuadrant < 2 ? 2 : Math.ceil(size/2);
    const maxY = targetQuadrant < 2 ? Math.floor(size/2) : size-3;

    const candidates = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (board[y][x] === 0 && this.isValidMove(board, x, y, color)) {
          candidates.push({ x, y });
        }
      }
    }

    return candidates.length > 0 
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : null;
  },

  // =============== 常规策略 ===============
  getStandardMove(board, color, size) {
    const simulations = 30;
    const candidates = [];
    const opponent = color === 1 ? 2 : 1;

    // 1. 优先考虑吃子机会
    const captureMoves = this.findCaptureMoves(board, color);
    candidates.push(...captureMoves);

    // 2. 考虑防守被吃的棋子
    const defenseMoves = this.findDefenseMoves(board, color);
    candidates.push(...defenseMoves);

    // 3. 考虑扩展或防守领地
    const territoryMoves = this.findTerritoryMoves(board, color);
    candidates.push(...territoryMoves);

    // 4. 如果还没有候选点，考虑关键点
    if (candidates.length < 5) {
      const keyPoints = this.getKeyPoints(size);
      for (const [x, y] of keyPoints) {
        if (board[y][x] === 0 && this.isValidMove(board, x, y, color)) {
          candidates.push({ x, y, priority: 0.5 });
        }
      }
    }

    // 5. 如果还没有候选点，考虑所有空位
    if (candidates.length === 0) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (board[y][x] === 0 && this.isValidMove(board, x, y, color)) {
            candidates.push({ x, y, priority: 0.1 });
          }
        }
      }
    }

    if (candidates.length === 0) return null;

    // 评估候选点
    const evaluatedCandidates = candidates.map(candidate => {
      const score = candidate.score || this.evaluateMove(board, candidate.x, candidate.y, color);
      return { ...candidate, score };
    });

    evaluatedCandidates.sort((a, b) => b.score - a.score);
    const top = evaluatedCandidates.slice(0, 3);
    return top[Math.floor(Math.random() * top.length)];
  },

  // =============== 辅助方法 ===============
  // 找可以吃子的位置
  findCaptureMoves(board, color) {
    const opponent = color === 1 ? 2 : 1;
    const size = board.length;
    const captures = [];
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (board[y][x] !== 0) continue;
        
        board[y][x] = color;
        const neighbors = this.getNeighbors(x, y, size);
        for (const [nx, ny] of neighbors) {
          if (board[ny][nx] === opponent && 
              !this.hasLiberties(board, nx, ny, opponent)) {
            captures.push({ x, y, score: 0.9 });
            break;
          }
        }
        board[y][x] = 0;
      }
    }
    return captures;
  },

  // 找需要防守的位置
  findDefenseMoves(board, color) {
    const size = board.length;
    const defenses = [];
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (board[y][x] !== color) continue;
        if (this.countLiberties(board, x, y) === 1) {
          const liberties = this.findLiberties(board, x, y);
          if (liberties.length > 0) {
            defenses.push({ 
              x: liberties[0].x, 
              y: liberties[0].y, 
              score: 0.8 
            });
          }
        }
      }
    }
    return defenses;
  },

  // 找扩展领地的位置
  findTerritoryMoves(board, color) {
    const size = board.length;
    const territoryMoves = [];
    const opponent = color === 1 ? 2 : 1;
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (board[y][x] !== 0) continue;
        
        const neighbors = this.getNeighbors(x, y, size);
        let myCount = 0;
        let oppCount = 0;
        
        for (const [nx, ny] of neighbors) {
          if (board[ny][nx] === color) myCount++;
          if (board[ny][nx] === opponent) oppCount++;
        }
        
        if (myCount > 0 || oppCount > 0) {
          const score = 0.3 + (myCount * 0.1) - (oppCount * 0.05);
          territoryMoves.push({ x, y, score });
        }
      }
    }
    return territoryMoves;
  },

  // 评估移动价值
  evaluateMove(board, x, y, color) {
    const opponent = color === 1 ? 2 : 1;
    const size = board.length;
    let score = 0;
    
    // 1. 位置价值（中央比边角更有价值）
    const centerDist = Math.sqrt(
      Math.pow(x - size/2, 2) + Math.pow(y - size/2, 2)
    );
    score += (size - centerDist) / size * 0.2;
    
    // 2. 模拟落子后的影响
    board[y][x] = color;
    score += this.countLiberties(board, x, y) * 0.05;
    
    // 检查是否能吃子
    const neighbors = this.getNeighbors(x, y, size);
    for (const [nx, ny] of neighbors) {
      if (board[ny][nx] === opponent && 
          !this.hasLiberties(board, nx, ny, opponent)) {
        score += 0.3;
      }
    }
    board[y][x] = 0;
    
    // 3. 简单模拟
    const simScore = this.simulateWinRate(board, x, y, color, 10);
    score += simScore * 0.5;
    
    return score;
  },

  // 模拟胜率
  simulateWinRate(board, x, y, color, simulations) {
    let win = 0;
    const opponent = color === 1 ? 2 : 1;
    const size = board.length;

    for (let i = 0; i < simulations; i++) {
      const simBoard = this.deepCopyBoard(board);
      simBoard[y][x] = color;

      let current = opponent;
      let moveCount = 0;
      let passes = 0;

      while (passes < 2 && moveCount < 100) {
        const moves = [];
        const captures = this.findCaptureMoves(simBoard, current);
        if (captures.length > 0) {
          moves.push(...captures.map(m => ({ ...m, priority: 0.9 })));
        }
        
        const defenses = this.findDefenseMoves(simBoard, current);
        if (defenses.length > 0) {
          moves.push(...defenses.map(m => ({ ...m, priority: 0.8 })));
        }
        
        if (moves.length === 0) {
          const empty = this.getAllEmptyPoints(simBoard);
          moves.push(...empty.map(pos => ({ ...pos, priority: 0.1 })));
        }
        
        const totalPriority = moves.reduce((sum, m) => sum + (m.priority || 0), 0);
        let random = Math.random() * totalPriority;
        let move = moves[0];
        
        for (const m of moves) {
          random -= m.priority || 0;
          if (random <= 0) {
            move = m;
            break;
          }
        }
        
        simBoard[move.y][move.x] = current;
        current = current === 1 ? 2 : 1;
        moveCount++;
        passes += Math.random() < 0.1 ? 1 : 0;
      }

      const myArea = this.estimateArea(simBoard, color);
      const oppArea = this.estimateArea(simBoard, opponent);
      if (myArea >= oppArea) win++;
    }

    return win / simulations;
  },

  // =============== 工具函数 ===============
  // 获取所有空位
  getAllEmptyPoints(board) {
    const pts = [];
    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board.length; x++) {
        if (board[y][x] === 0) pts.push({ x, y });
      }
    }
    return pts;
  },

  // 获取关键点（星位+天元）
  getKeyPoints(size) {
    const points = [];
    if (size % 2 === 1) {
      points.push([Math.floor(size/2), Math.floor(size/2)]); // 天元
    }
    points.push(...getStarPoints(size));
    return points;
  },

  // 计算棋子数量
  countStones(board) {
    let count = 0;
    for (const row of board) {
      for (const cell of row) {
        if (cell !== 0) count++;
      }
    }
    return count;
  },

  // 检查移动是否合法
  isValidMove(board, x, y, color) {
    if (board[y][x] !== 0) return false;
    
    // 这里可以添加更多规则检查（如打劫等）
    return true;
  },

  // 获取相邻位置
  getNeighbors(x, y, size) {
    const neighbors = [];
    if (x > 0) neighbors.push([x-1, y]);
    if (x < size-1) neighbors.push([x+1, y]);
    if (y > 0) neighbors.push([x, y-1]);
    if (y < size-1) neighbors.push([x, y+1]);
    return neighbors;
  },

  // 计算气
  countLiberties(board, x, y) {
    const color = board[y][x];
    if (color === 0) return 0;
    
    const visited = new Set();
    const queue = [[x, y]];
    let liberties = 0;
    const size = board.length;
    
    while (queue.length > 0) {
      const [cx, cy] = queue.pop();
      const key = `${cx},${cy}`;
      if (visited.has(key)) continue;
      visited.add(key);
      
      for (const [nx, ny] of this.getNeighbors(cx, cy, size)) {
        if (board[ny][nx] === 0) {
          liberties++;
        } else if (board[ny][nx] === color) {
          queue.push([nx, ny]);
        }
      }
    }
    return liberties;
  },

  // 检查是否有气
  hasLiberties(board, x, y, color) {
    return this.countLiberties(board, x, y) > 0;
  },

  // 找到所有气
  findLiberties(board, x, y) {
    const color = board[y][x];
    if (color === 0) return [];
    
    const visited = new Set();
    const queue = [[x, y]];
    const liberties = new Set();
    const size = board.length;
    
    while (queue.length > 0) {
      const [cx, cy] = queue.pop();
      const key = `${cx},${cy}`;
      if (visited.has(key)) continue;
      visited.add(key);
      
      for (const [nx, ny] of this.getNeighbors(cx, cy, size)) {
        if (board[ny][nx] === 0) {
          liberties.add(`${nx},${ny}`);
        } else if (board[ny][nx] === color) {
          queue.push([nx, ny]);
        }
      }
    }
    
    return Array.from(liberties).map(pos => {
      const [x, y] = pos.split(',').map(Number);
      return { x, y };
    });
  },

  // 估算控制区域
  estimateArea(board, color) {
    const size = board.length;
    let area = 0;
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (board[y][x] === color) {
          area += 1;
        } else if (board[y][x] === 0) {
          const myDist = this.closestStoneDistance(board, x, y, color);
          const oppDist = this.closestStoneDistance(board, x, y, color === 1 ? 2 : 1);
          
          if (myDist < oppDist) {
            area += 0.5;
          } else if (myDist === oppDist) {
            area += 0.25;
          }
        }
      }
    }
    return area;
  },

  // 计算最近同色棋子距离
  closestStoneDistance(board, x, y, color) {
    const size = board.length;
    let minDist = Infinity;
    
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        if (board[dy][dx] === color) {
          const dist = Math.abs(dx - x) + Math.abs(dy - y);
          if (dist < minDist) minDist = dist;
        }
      }
    }
    return minDist === Infinity ? size * 2 : minDist;
  },

  // 深拷贝棋盘
  deepCopyBoard(board) {
    return board.map(row => [...row]);
  }
};

// 星位定义（保持不变）
function getStarPoints(size) {
  if (size === 9) return [[2,2],[6,2],[2,6],[6,6],[4,4]];
  if (size === 13) return [[3,3],[9,3],[3,9],[9,9],[6,6]];
  if (size === 19) return [[3,3],[9,3],[15,3],[3,9],[9,9],[15,9],[3,15],[9,15],[15,15]];
  return [];
}