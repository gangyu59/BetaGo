function renderBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';

  const size = window.game.boardSize;
  const cellSize = Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.8 / size);
  document.documentElement.style.setProperty('--cell-size', `${cellSize}px`);
  document.documentElement.style.setProperty('--line-count', size);
  document.documentElement.style.setProperty('--grid-size', `calc(${size - 1} * var(--cell-size))`);

  const starPoints = getStarPoints(size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const intersection = document.createElement('div');
      intersection.className = 'intersection';
      intersection.dataset.x = x;
      intersection.dataset.y = y;

      intersection.style.left = `${x * cellSize}px`;
      intersection.style.top = `${y * cellSize}px`;

      if (starPoints.some(([sx, sy]) => sx === x && sy === y)) {
        const star = document.createElement('div');
        star.className = 'star-point';
        intersection.appendChild(star);
      }

      intersection.addEventListener('click', () => {
        const me = window.game.playerColor;
        const isMyTurn = window.game.currentPlayer === me;
        const aiDisabled = !window.aiMode[me];

        if (isMyTurn && aiDisabled) {
          const success = placeStone(x, y);

          // ✅ 联网模式：手动发送同步信息
          if (success && window.gameMode === 'online' && window.sendMove) {
            window.sendMove({ x, y });
          }

          // ✅ 本地人机模式：若轮到 AI，立即触发
          if (success && window.gameMode === 'local') {
            const next = window.game.currentPlayer;
            if (window.aiMode[next]) {
              setTimeout(() => requestAIMove(next), 100);
            }
          }
        }
      });

      board.appendChild(intersection);
    }
  }

  updateBoardUI();
}

function getStarPoints(size) {
  if (size === 9) return [[2,2],[6,2],[2,6],[6,6],[4,4]];
  if (size === 13) return [[3,3],[9,3],[3,9],[9,9],[6,6]];
  if (size === 19) return [[3,3],[9,3],[15,3],[3,9],[9,9],[15,9],[3,15],[9,15],[15,15]];
  return [];
}

function updateBoardUI() {
  document.querySelectorAll('.stone').forEach(el => el.remove());
  const board = window.game.board;
  const lastMove = window.lastMove || null;

  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board[y].length; x++) {
      const val = board[y][x];
      if (val === 1 || val === 2) {
        const stone = document.createElement('div');
        stone.className = 'stone ' + (val === 1 ? 'black-stone' : 'white-stone');

        if (lastMove && lastMove.x === x && lastMove.y === y) {
          const dot = document.createElement('div');
          dot.className = 'red-dot';
          stone.appendChild(dot);
        }

        const intersection = document.querySelector(`.intersection[data-x="${x}"][data-y="${y}"]`);
        if (intersection) intersection.appendChild(stone);
      }
    }
  }
}

function switchPlayer() {
  window.game.currentPlayer = window.game.currentPlayer === 'black' ? 'white' : 'black';
}

function switchTurn(color) {
  return color === 'black' ? 'white' : 'black';
}

function restartGame(isRemote = false) {
  logDebug("🔄 重新开始新的一局");

  if (window.timerHandles) {
    for (const color of ['black', 'white']) {
      if (timerHandles[color]) {
        clearInterval(timerHandles[color]);
        timerHandles[color] = null;
        document.getElementById(`${color}-timer`).classList.remove('active');
      }
    }
  }

  window.remainingTime = {
    black: 3600,
    white: 3600
  };

  initGame(window.game.boardSize);

  if (window.gameMode === 'local') {
    const color = window.game.playerColor || 'black';
    window.game.playerColor = color;
    window.aiMode = {
      black: color === 'white',
      white: color === 'black'
    };
  } else {
    window.game.playerColor = isRemote ? 'white' : 'black';
  }

  updateBoardUI();
  updatePlayerColorInfo();
  startTimer(window.game.currentPlayer);

  document.getElementById("resultBox").style.display = "none";
  document.getElementById("restartBtn").style.display = "none";

  if (window.gameMode === 'online' && !isRemote && window.sendMove) {
    window.sendMove({
      type: 'restart',
      board: window.game.board,
      currentPlayer: window.game.currentPlayer,
      playerColor: 'black'
    });
  }

  hideConnectionInfo();

  // 人机对弈下，如果 AI 先手，立即触发
  if (window.gameMode === 'local' && window.aiMode[window.game.currentPlayer]) {
    requestAIMove(window.game.currentPlayer);
  }
}

function updatePlayerColorInfo() {
  const label = document.getElementById('playerColorLabel');
  if (!label) return;
  label.textContent = window.game.playerColor === 'black' ? '⚫' : '⚪';
}