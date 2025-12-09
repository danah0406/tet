// ==================== 설정 및 변수 ====================
const canvas = document.getElementById('tetris-canvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const startButton = document.getElementById('start-button');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreElement = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');

// 모바일 컨트롤 버튼
const rotateBtn = document.getElementById('rotate-btn');
const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');
const downBtn = document.getElementById('down-btn');

const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = canvas.width / COLS; // 한 블록의 크기 (300 / 10 = 30)

// 7가지 테트로미노 모양 및 색상 정의 (J, L, O, S, Z, T, I)
const TETROMINOES = [
    {
        shape: [[0, 1, 0], [0, 1, 0], [1, 1, 0]],
        color: 'blue'
    },
    {
        shape: [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
        color: 'orange'
    },
    {
        shape: [[1, 1], [1, 1]],
        color: 'yellow'
    },
    {
        shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
        color: 'lime'
    },
    {
        shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
        color: 'red'
    },
    {
        shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
        color: 'purple'
    },
    {
        shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
        color: 'cyan'
    }
];

// 게임 상태 변수
let board;
let currentBlock;
let nextBlock;
let score;
let lastTime = 0;
let dropCounter = 0;
let dropInterval = 1000; // 1초마다 블록 낙하

// ==================== 기본 함수 ====================

// 20x10 빈 보드 생성
function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0)); // 0은 빈 공간
}

// 블록 모양을 회전시키는 함수 (행렬 전치 및 반전)
function rotateMatrix(matrix, dir) {
    // 행렬을 전치 (transpose)
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    // 방향에 따라 행 또는 열을 반전
    if (dir > 0) { // 시계 방향 회전 (열 반전)
        matrix.forEach(row => row.reverse());
    } else { // 반시계 방향 회전 (행 반전)
        matrix.reverse();
    }
    return matrix;
}

// 랜덤으로 새로운 블록을 생성하고 다음 블록으로 설정
function getNewBlock() {
    const randIndex = Math.floor(Math.random() * TETROMINOES.length);
    const piece = TETROMINOES[randIndex];
    
    return {
        shape: JSON.parse(JSON.stringify(piece.shape)), // 깊은 복사
        color: piece.color,
        x: Math.floor(COLS / 2) - Math.floor(piece.shape[0].length / 2),
        y: 0
    };
}

// 현재 블록의 충돌 여부를 확인하는 함수
function checkCollision(board, block) {
    const shape = block.shape;
    const offsetX = block.x;
    const offsetY = block.y;

    for (let y = 0; y < shape.length; ++y) {
        for (let x = 0; x < shape[y].length; ++x) {
            // 블록 조각이 있고, 충돌 조건(보드 밖이거나 이미 채워진 칸)을 만족하는지 확인
            if (shape[y][x] !== 0 && (
                // 1. 가로 경계를 벗어남
                offsetX + x < 0 || offsetX + x >= COLS ||
                // 2. 바닥을 벗어남
                offsetY + y >= ROWS ||
                // 3. 이미 쌓여 있는 블록과 겹침
                board[offsetY + y][offsetX + x] !== 0
            )) {
                return true;
            }
        }
    }
    return false;
}

// 블록을 보드에 병합 (쌓기)
function mergeBlock() {
    currentBlock.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[currentBlock.y + y][currentBlock.x + x] = currentBlock.color;
            }
        });
    });
}

// ==================== 그리기 함수 ====================

// 단일 블록 (사각형)을 그리는 함수
function drawSquare(x, y, color, context) {
    context.fillStyle = color;
    context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    context.strokeStyle = '#333';
    context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

// 보드와 현재 블록을 모두 그리는 메인 드로잉 함수
function draw() {
    // 캔버스 초기화
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 보드에 쌓인 블록 그리기
    board.forEach((row, y) => {
        row.forEach((color, x) => {
            if (color !== 0) {
                drawSquare(x, y, color, ctx);
            }
        });
    });

    // 현재 움직이는 블록 그리기
    if (currentBlock) {
        currentBlock.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawSquare(currentBlock.x + x, currentBlock.y + y, currentBlock.color, ctx);
                }
            });
        });
    }
}

// 다음 블록 미리보기 캔버스 그리기
function drawNextBlock() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (nextBlock) {
        const nextBlockSize = nextCanvas.width / 4; // 4x4에 맞춤
        const shape = nextBlock.shape;
        
        shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    nextCtx.fillStyle = nextBlock.color;
                    nextCtx.fillRect(x * nextBlockSize, y * nextBlockSize, nextBlockSize, nextBlockSize);
                    nextCtx.strokeStyle = '#333';
                    nextCtx.strokeRect(x * nextBlockSize, y * nextBlockSize, nextBlockSize, nextBlockSize);
                }
            });
        });
    }
}

// ==================== 게임 로직 ====================

// 줄이 꽉 찼는지 확인하고 제거하는 함수
function checkLines() {
    let linesCleared = 0;
    for (let y = ROWS - 1; y >= 0; --y) {
        // 해당 줄이 꽉 찼는지 확인
        if (board[y].every(cell => cell !== 0)) {
            // 줄을 제거하고, 윗 줄들을 한 칸씩 내림
            const row = board.splice(y, 1)[0].fill(0);
            board.unshift(row); // 맨 위에 빈 줄을 추가
            y++; // 줄 제거 후 검사를 위해 인덱스를 다시 증가
            linesCleared++;
        }
    }
    if (linesCleared > 0) {
        // 점수 계산 (테트리스 방식)
        const points = [0, 100, 300, 500, 800]; // 0, 1줄, 2줄, 3줄, 4줄
        score += points[linesCleared];
        scoreElement.textContent = score;

        // 레벨에 따라 낙하 속도 증가 (선택 사항)
        // dropInterval = Math.max(100, dropInterval - (linesCleared * 10)); 
    }
}

// 블록을 아래로 떨어뜨리는 함수
function blockDrop() {
    currentBlock.y++;
    if (checkCollision(board, currentBlock)) {
        currentBlock.y--; // 충돌했으므로 원위치
        mergeBlock(); // 보드에 블록 쌓기
        checkLines(); // 줄 제거 확인
        currentBlock = nextBlock; // 다음 블록 가져오기
        nextBlock = getNewBlock(); // 새로운 다음 블록 생성
        drawNextBlock();

        // 게임 오버 확인 (새 블록 생성 즉시 충돌)
        if (checkCollision(board, currentBlock)) {
            gameOver();
            return;
        }
    }
    dropCounter = 0;
}

// 블록 이동 (move: x축 이동 값, -1=왼쪽, 1=오른쪽)
function moveBlock(move) {
    const originalX = currentBlock.x;
    currentBlock.x += move;
    if (checkCollision(board, currentBlock)) {
        currentBlock.x = originalX; // 충돌 시 원위치
    }
}

// 블록 회전 (dir: 1=시계 방향, -1=반시계 방향)
function rotateBlock(dir = 1) {
    const originalShape = JSON.parse(JSON.stringify(currentBlock.shape));
    const originalX = currentBlock.x;
    currentBlock.shape = rotateMatrix(currentBlock.shape, dir);

    // 벽차기(Wall Kick) 로직 - 회전 후 충돌 시 옆으로 한 칸 이동 시도
    let offset = 1;
    while (checkCollision(board, currentBlock)) {
        currentBlock.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1)); // 1, -2, 3, -4 ...
        if (offset > 5) { // 5번 이동 시도 후에도 실패하면 회전 취소
            currentBlock.shape = originalShape;
            currentBlock.x = originalX;
            return;
        }
    }
}

// ==================== 메인 루프 및 게임 관리 ====================

// 게임 루프 (애니메이션 프레임을 이용)
function update(time = 0) {
    if (!currentBlock) return; // 게임이 시작되지 않았으면 종료

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        blockDrop();
    }

    draw();
    
    // 게임이 진행 중일 때만 다음 프레임을 요청
    if (!gameOverScreen.style.display || gameOverScreen.style.display === 'none') {
        requestAnimationFrame(update);
    }
}

function gameOver() {
    cancelAnimationFrame(update);
    finalScoreElement.textContent = score;
    gameOverScreen.style.display = 'flex';
    startButton.style.display = 'block'; // 시작 버튼 다시 보이기
}

function initializeGame() {
    board = createBoard();
    score = 0;
    scoreElement.textContent = score;
    dropInterval = 1000;
    dropCounter = 0;
    lastTime = 0;
    
    // 첫 블록 생성 및 다음 블록 준비
    currentBlock = getNewBlock();
    nextBlock = getNewBlock();
    drawNextBlock();

    // 게임 오버 화면 숨기기
    gameOverScreen.style.display = 'none';

    // 메인 루프 시작
    update();
}

// ==================== 이벤트 리스너 (PC 키보드 및 모바일 터치) ====================

// 키보드 이벤트 리스너 (PC 사용자를 위해)
document.addEventListener('keydown', event => {
    if (currentBlock) { // 게임이 시작된 후에만 작동
        if (event.key === 'ArrowLeft') {
            moveBlock(-1);
        } else if (event.key === 'ArrowRight') {
            moveBlock(1);
        } else if (event.key === 'ArrowDown') {
            blockDrop();
        } else if (event.key === 'ArrowUp' || event.key === ' ' || event.key === 'x' || event.key === 'X') {
            rotateBlock(1);
        }
        draw();
    }
});

// 모바일 터치 이벤트 리스너
rotateBtn.addEventListener('click', () => {
    if (currentBlock) {
        rotateBlock(1);
        draw();
    }
});

leftBtn.addEventListener('click', () => {
    if (currentBlock) {
        moveBlock(-1);
        draw();
    }
});

rightBtn.addEventListener('click', () => {
    if (currentBlock) {
        moveBlock(1);
        draw();
    }
});

downBtn.addEventListener('click', () => {
    if (currentBlock) {
        blockDrop();
        draw();
    }
});

// 게임 시작/다시 시작 버튼 리스너
startButton.addEventListener('click', () => {
    startButton.style.display = 'none';
    initializeGame();
});

restartButton.addEventListener('click', () => {
    gameOverScreen.style.display = 'none';
    initializeGame();
});

// 초기화 시뮬레이션 (페이지 로드 시)
(function init() {
    draw(); // 빈 보드를 한 번 그립니다.
    drawNextBlock(); // 빈 다음 블록 캔버스를 그립니다.
})();
