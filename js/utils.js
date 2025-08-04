// utils.js：工具函数集合

/**
 * 终局计分：先移除死子，再统计地盘和贴目
 */
function calculateScore() {
  const board = window.game.board;
  const size = board.length;

  // 深拷贝棋盘用于计算，不改变真实状态
  const temp = board.map(row => [...row]);
  const visited = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );

  let blackStones = 0, whiteStones = 0,
      blackTerritory = 0, whiteTerritory = 0;

  // 1. 识别并移除死子（气为0的连通块）
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cell = temp[y][x];
      if ((cell === 1 || cell === 2) && !visited[y][x]) {
        const group = findGroup(x, y, temp);
        const liberties = countLiberties(group, temp);
        group.forEach(([gx, gy]) => visited[gy][gx] = true);
        if (liberties === 0) {
          // 标记为死子，移除
          group.forEach(([gx, gy]) => temp[gy][gx] = 0);
        }
      }
    }
  }

  /* reset visited to reuse for territory flood */
  for (let row of visited) row.fill(false);

  // 2. 计算活子数（移除死子后）
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (temp[y][x] === 1) blackStones++;
      else if (temp[y][x] === 2) whiteStones++;
    }
  }

  // 3. 统计地盘
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (temp[y][x] === 0 && !visited[y][x]) {
        const queue = [[x, y]];
        const area = [];
        const surround = new Set();

        while (queue.length) {
          const [cx, cy] = queue.pop();
          if (
            cx < 0 || cy < 0 ||
            cx >= size || cy >= size ||
            visited[cy][cx] ||
            temp[cy][cx] !== 0
          ) continue;

          visited[cy][cx] = true;
          area.push([cx, cy]);

          for (const [nx, ny] of getNeighbors(cx, cy)) {
            const val = temp[ny][nx];
            if (val === 0 && !visited[ny][nx]) queue.push([nx, ny]);
            else if (val === 1 || val === 2) surround.add(val);
          }
        }

        if (surround.size === 1) {
          if (surround.has(1)) blackTerritory += area.length;
          else whiteTerritory += area.length;
        }
      }
    }
  }

  const komi = 6.5;
  const blackScore = blackStones + blackTerritory;
  const whiteScore = whiteStones + whiteTerritory + komi;
  const winner = blackScore > whiteScore ? 'black' : 'white';

  return {
    blackStones,
    whiteStones,
    blackTerritory,
    whiteTerritory,
    blackScore,
    whiteScore,
    winner,
    summary: `⚫ 黑：${blackScore}（${blackStones}子 + ${blackTerritory}地） vs ⚪ 白：${whiteScore.toFixed(1)}（${whiteStones}子 + ${whiteTerritory}地 + 贴目${komi}） ➜ 胜者：${winner === 'black' ? '黑' : '白'}`
  };
}

window.logDebug = function(msg, isError = false) {
  const el = document.getElementById("debug-log");
  if (el) {
    el.innerHTML += `<p style="color:${isError ? 'red' : 'green'}">${msg}</p>`;
    el.scrollTop = el.scrollHeight;
  }
  console[isError ? "error" : "log"](msg);
};

// 全局定时器句柄
window.timerHandles = {
  black: null,
  white: null
};

// 全局剩余时间（默认每方 1 小时）
window.remainingTime = {
  black: 3600,
  white: 3600
};

// 格式化秒为 mm:ss
window.formatTime = function(seconds) {
  const min = String(Math.floor(seconds / 60)).padStart(2, '0');
  const sec = String(seconds % 60).padStart(2, '0');
  return `${min}:${sec}`;
};

/**
 * 启动倒计时
 * @param {'black'|'white'} playerColor 当前执棋方
 */
window.startTimer = function(playerColor) {
  const opponent = playerColor === 'black' ? 'white' : 'black';

  // 停止对方的定时器
  if (timerHandles[opponent]) {
    clearInterval(timerHandles[opponent]);
    timerHandles[opponent] = null;
    document.getElementById(`${opponent}-timer`).classList.remove('active');
  }

  // 启动当前玩家计时
  const label = document.getElementById(`${playerColor}-timer`);
  if (!label) return;

  document.getElementById(`${playerColor}-timer`).classList.add('active');

  if (timerHandles[playerColor]) {
    clearInterval(timerHandles[playerColor]);
  }

  timerHandles[playerColor] = setInterval(() => {
    if (remainingTime[playerColor] <= 0) {
      clearInterval(timerHandles[playerColor]);
      timerHandles[playerColor] = null;
      alert(`⏰ ${playerColor === 'black' ? '黑方' : '白方'}时间到！`);
      return;
    }

    remainingTime[playerColor]--;
    label.textContent = formatTime(remainingTime[playerColor]);
  }, 1000);
};

// 预加载落子音效
const stoneSound = new Audio('assets/stone-sound.mp3');

window.playStoneSound = function() {
  stoneSound.currentTime = 0;
  stoneSound.play().catch(e => {
    console.warn('⚠️ 试图播放落子音效但失败：', e);
  });
}

//隐去Peer ID和房间信息
window.hideConnectionInfo = function() {
  const infoBox = document.getElementById('waitingView');
  if (infoBox) {
    infoBox.style.display = 'none';
  }
};

window.createEmptyBoard = function(size) {
  return Array(size).fill().map(() => Array(size).fill(0));
};

// 棋盘工具
window.copyBoard = function(board) {
  return board.map(row => row.slice());
}

// 获取相邻点位
window.getNeighbors = function(x, y, size) {
  const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
  return dirs.map(([dx, dy]) => [x+dx, y+dy])
    .filter(([nx, ny]) => nx >=0 && ny >=0 && nx < size && ny < size);
}

// 随机走子（带有效性检查）
window.getRandomMove = function(board, color) {
  const empties = [];
  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board.length; x++) {
      if (board[y][x] === 0 && window.AIEval.isValidMove(board, x, y, color)) {
        empties.push({x, y});
      }
    }
  }
  return empties.length > 0 ? empties[Math.floor(Math.random() * empties.length)] : null;
};

// 超时检查工具
window.runWithTimeout = function(fn, timeoutMs, fallbackResult) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(fallbackResult);
    }, timeoutMs);
    
    const result = fn();
    clearTimeout(timer);
    resolve(result);
  });
};