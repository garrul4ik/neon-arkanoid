import { Ball } from '../entities/Ball.js';
import { Paddle } from '../entities/Paddle.js';
import { Block } from '../entities/Block.js';
import { ParticleSystem, ParticleEffects } from '../utils/particles.js';
import { CONFIG } from '../config.js';
import { AudioManager } from './Audio.js';

export class Game {
    constructor() {
        if (!this.checkBrowserSupport()) {
            const message = 'Ваш браузер не поддерживает необходимые технологии:\n' +
                          '- Canvas для отрисовки графики\n' +
                          '- Web Audio API для звуков\n' +
                          '- RequestAnimationFrame для анимации\n\n' +
                          'Пожалуйста, обновите браузер или используйте другой.';
            throw new Error(message);
        }
        
        this.gameWidth = CONFIG.GAME_WIDTH;
        this.gameHeight = CONFIG.GAME_HEIGHT;
        this.gameActive = false;
        this.paused = false;
        this.score = 0;
        this.lives = CONFIG.GAME.INITIAL_LIVES;
        this.level = 1;
        this.highScores = this.loadHighScores();
        this.ballSpeed = CONFIG.BALL.INITIAL_SPEED;
        this.paddleWidth = CONFIG.PADDLE.WIDTH;
        this.cheatMode = false;
        this.powerUps = [];
        this.balls = [];

        // Игровые объекты
        this.canvas = null;
        this.ctx = null;
        this.ball = null;
        this.paddle = null;
        this.blocks = [];
        this.particles = null;
        this.audioManager = new AudioManager();

        // Привязка методов
        this.gameLoop = this.gameLoop.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.updateCustomCursor = this.updateCustomCursor.bind(this);

        // Создаем начальный мяч
        this.resetBall();
    }

    async init() {
        // Инициализация canvas
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();

        // Создаем игровые объекты
        this.paddle = new Paddle(this);
        this.ball = new Ball(this, this.paddle.x + this.paddle.width / 2, this.paddle.y - 10);
        this.particles = new ParticleSystem();

        // Инициализируем аудио
        await this.audioManager.init();

        // Создаем блоки
        this.createBlocks();

        // Добавляем обработчики событий
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mousemove', this.updateCustomCursor);
        window.addEventListener('click', this.handleClick);
        window.addEventListener('resize', () => this.setupCanvas());
        
        // Добавляем обработчики touch-событий
        this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: true });

        // Добавляем обработчики для новых кнопок
        document.getElementById('exitGame').addEventListener('click', () => {
            this.togglePause(); // Сначала ставим на паузу
        });

        document.getElementById('resumeGame').addEventListener('click', () => {
            this.togglePause();
        });

        document.getElementById('exitToMenu').addEventListener('click', () => {
            this.exitToMainMenu();
        });

        // Обновляем обработчик клавиатуры
        window.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            
            switch(e.code) {
                case 'Space':
                    if (!this.gameActive) {
                        this.start();
                        this.audioManager.playMusic('background');
                    } else {
                        this.launchBall();
                    }
                    break;
                case 'KeyP':
                    this.togglePause();
                    break;
                case 'KeyM':
                    document.getElementById('toggleMusic').click();
                    break;
                case 'KeyS':
                    document.getElementById('toggleSound').click();
                    break;
                case 'Escape':
                    if (this.gameActive) {
                        if (this.paused) {
                            this.exitToMainMenu();
                        } else {
                            this.togglePause();
                        }
                    }
                    break;
            }
        });

        // Запускаем игровой цикл
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop);
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const scale = Math.min(containerWidth / this.gameWidth, containerHeight / this.gameHeight);

        this.canvas.width = this.gameWidth;
        this.canvas.height = this.gameHeight;
        this.canvas.style.width = `${this.gameWidth * scale}px`;
        this.canvas.style.height = `${this.gameHeight * scale}px`;
    }

    createBlocks() {
        this.blocks = [];
        const { WIDTH: blockWidth, HEIGHT: blockHeight, PADDING: padding } = CONFIG.BLOCK;
        const level = CONFIG.LEVELS[(this.level - 1) % CONFIG.LEVELS.length];
        const pattern = level.pattern;
        
        const rows = pattern.length;
        const cols = pattern[0].length;
        const topOffset = 50;
        const leftOffset = (this.gameWidth - (cols * (blockWidth + padding))) / 2;

        // Создаем сетку для проверки доступности
        const grid = [];
        const blockRefs = [];
        
        // Инициализируем сетку
        for (let row = 0; row < rows; row++) {
            grid[row] = [];
            for (let col = 0; col < cols; col++) {
                const blockType = pattern[row][col];
                if (blockType === 'X') {
                    grid[row][col] = null; // пустое место
                    continue;
                }
                
                const block = new Block(
                    this,
                    leftOffset + col * (blockWidth + padding),
                    topOffset + row * (blockHeight + padding),
                    blockWidth,
                    blockHeight,
                    blockType === 'U' ? 'unbreakable' : 
                    blockType === 'H' ? 'hard' : 'normal'
                );
                
                grid[row][col] = block;
                if (blockType !== 'U') { // если блок разрушаемый
                    blockRefs.push({ row, col, block });
                }
                this.blocks.push(block);
            }
        }

        // Проверяем доступность каждого разрушаемого блока
        const unreachableBlocks = this.findUnreachableBlocks(grid, blockRefs);
        
        // Если есть недоступные блоки, заменяем их на доступные
        if (unreachableBlocks.length > 0) {
            console.warn(`Found ${unreachableBlocks.length} unreachable blocks, fixing level design...`);
            this.fixUnreachableBlocks(grid, unreachableBlocks);
        }
    }

    findUnreachableBlocks(grid, blockRefs) {
        const rows = grid.length;
        const cols = grid[0].length;
        const unreachableBlocks = [];

        // Для каждого разрушаемого блока проверяем, есть ли к нему путь снизу
        for (const { row, col, block } of blockRefs) {
            if (!this.isBlockReachable(grid, row, col, rows, cols)) {
                unreachableBlocks.push({ row, col, block });
            }
        }

        return unreachableBlocks;
    }

    isBlockReachable(grid, startRow, startCol, rows, cols) {
        const visited = Array(rows).fill().map(() => Array(cols).fill(false));
        const queue = [];
        
        // Начинаем с нижней границы
        for (let col = 0; col < cols; col++) {
            queue.push({ row: rows - 1, col });
            visited[rows - 1][col] = true;
        }

        // Направления для проверки (включая диагонали)
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1],  // вертикаль и горизонталь
            [-1, -1], [-1, 1], [1, -1], [1, 1]  // диагонали
        ];

        while (queue.length > 0) {
            const { row, col } = queue.shift();

            // Если достигли целевого блока
            if (row === startRow && col === startCol) {
                return true;
            }

            // Проверяем все направления
            for (const [dRow, dCol] of directions) {
                const newRow = row + dRow;
                const newCol = col + dCol;

                // Проверяем границы и посещенные клетки
                if (newRow < 0 || newRow >= rows || 
                    newCol < 0 || newCol >= cols || 
                    visited[newRow][newCol]) {
                    continue;
                }

                // Проверяем, можно ли пройти через эту клетку
                const block = grid[newRow][newCol];
                if (block === null || block.type !== 'unbreakable') {
                    queue.push({ row: newRow, col: newCol });
                    visited[newRow][newCol] = true;
                }
            }
        }

        return false;
    }

    fixUnreachableBlocks(grid, unreachableBlocks) {
        for (const { row, col, block } of unreachableBlocks) {
            // Находим ближайший неразрушаемый блок, который делает этот блок недоступным
            const nearestUnbreakable = this.findNearestUnbreakable(grid, row, col);
            
            if (nearestUnbreakable) {
                // Заменяем неразрушаемый блок на обычный
                const { row: uRow, col: uCol, block: uBlock } = nearestUnbreakable;
                const index = this.blocks.indexOf(uBlock);
                if (index !== -1) {
                    const newBlock = new Block(
                        this,
                        uBlock.x,
                        uBlock.y,
                        uBlock.width,
                        uBlock.height,
                        'normal'
                    );
                    this.blocks[index] = newBlock;
                    grid[uRow][uCol] = newBlock;
                }
            }
        }
    }

    findNearestUnbreakable(grid, targetRow, targetCol) {
        const rows = grid.length;
        const cols = grid[0].length;
        const visited = Array(rows).fill().map(() => Array(cols).fill(false));
        const queue = [{ row: targetRow, col: targetCol, distance: 0 }];
        visited[targetRow][targetCol] = true;

        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, -1], [-1, 1], [1, -1], [1, 1]
        ];

        while (queue.length > 0) {
            const { row, col, distance } = queue.shift();

            for (const [dRow, dCol] of directions) {
                const newRow = row + dRow;
                const newCol = col + dCol;

                if (newRow < 0 || newRow >= rows || 
                    newCol < 0 || newCol >= cols || 
                    visited[newRow][newCol]) {
                    continue;
                }

                visited[newRow][newCol] = true;
                const block = grid[newRow][newCol];

                if (block && block.type === 'unbreakable') {
                    return { row: newRow, col: newCol, block };
                }

                queue.push({ 
                    row: newRow, 
                    col: newCol, 
                    distance: distance + 1 
                });
            }
        }

        return null;
    }

    start() {
        if (!this.gameActive) {
            this.gameActive = true;
            this.score = 0;
            this.lives = 3;
            this.level = 1;
            this.createBlocks();
            this.paddle.reset();
            this.ball.reset(this.paddle.x + this.paddle.width / 2, this.paddle.y - 10);
            document.querySelector('.game-container').classList.add('active');
        }
    }

    restart() {
        this.start();
    }

    togglePause() {
        this.paused = !this.paused;
        document.getElementById('pauseMessage').classList.toggle('show', this.paused);
    }

    gameLoop(currentTime) {
        // Вычисляем deltaTime
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        if (!this.gameActive || this.paused) {
            requestAnimationFrame(this.gameLoop);
            return;
        }

        // Очищаем canvas
        this.ctx.clearRect(0, 0, this.gameWidth, this.gameHeight);

        // Обновляем состояние
        this.update(deltaTime);

        // Отрисовываем
        this.draw(this.ctx);

        // Следующий кадр
        requestAnimationFrame(this.gameLoop);
    }

    update(deltaTime) {
        if (this.gameOver || this.levelComplete) return;

        // Обновляем объекты
        this.paddle.update(deltaTime);
        
        // Обновляем мячи
        this.balls.forEach(ball => {
            if (ball) ball.update(deltaTime);
        });
        
        // Обновляем частицы
        if (this.particles) this.particles.update(deltaTime);
        
        // Обновляем бонусы
        this.powerUps = this.powerUps.filter(powerUp => {
            if (powerUp) {
                powerUp.update(deltaTime);
                return !powerUp.isCollected;
            }
            return false;
        });

        // Проверяем столкновения
        this.balls.forEach(ball => {
            if (ball) ball.checkCollision(this.paddle);
        });

        this.blocks.forEach(block => {
            if (block) {
                block.update(deltaTime);
                this.balls.forEach(ball => {
                    if (ball && block.checkCollision(ball)) {
                        // Создаем эффект при разрушении блока
                        const emitter = this.particles.createEmitter({
                            ...ParticleEffects.EXPLOSION,
                            x: block.x + block.width / 2,
                            y: block.y + block.height / 2,
                            particleColor: block.getColor()
                        });
                        setTimeout(() => this.particles.removeEmitter(emitter), 1000);
                    }
                });
            }
        });

        // Удаляем разрушенные блоки
        this.blocks = this.blocks.filter(block => block && !block.isDestroyed);

        // Удаляем выпавшие мячи
        this.balls = this.balls.filter(ball => ball && ball.y <= this.gameHeight);

        // Проверяем условия победы/поражения
        this.checkGameStatus();
    }

    draw(ctx) {
        if (!ctx) return;

        // Очищаем экран
        ctx.clearRect(0, 0, this.gameWidth, this.gameHeight);

        // Рисуем объекты
        this.blocks.forEach(block => {
            if (block) block.draw(ctx);
        });

        if (this.paddle) this.paddle.draw(ctx);
        
        this.balls.forEach(ball => {
            if (ball) ball.draw(ctx);
        });

        if (this.particles) this.particles.draw(ctx);

        // Рисуем бонусы
        this.powerUps.forEach(powerUp => {
            if (powerUp) powerUp.draw(ctx);
        });

        // Рисуем UI
        this.drawUI(ctx);
    }

    checkGameStatus() {
        // Проигрыш только если все мячи выпали
        if (this.balls.length === 0) {
            this.lives--;
            if (this.lives > 0) {
                this.resetBall();
            } else {
                this.gameOver = true;
            }
        }

        // Победа если все блоки уничтожены
        if (this.blocks.length === 0) {
            this.levelComplete = true;
        }
    }

    levelComplete() {
        this.level++;
        this.ballSpeed = Math.min(
            CONFIG.BALL.INITIAL_SPEED + (this.level - 1) * CONFIG.BALL.SPEED_INCREASE,
            CONFIG.BALL.MAX_SPEED
        );

        const message = document.getElementById('levelCompleteMessage');
        message.querySelector('.message-title').textContent = `Уровень ${this.level - 1} пройден!`;
        message.classList.add('show');
        
        setTimeout(() => {
            message.classList.remove('show');
            this.createBlocks();
            this.paddle.reset();
            this.ball.reset(this.paddle.x + this.paddle.width / 2, this.paddle.y - 10);
        }, 2000);
    }

    gameOver() {
        this.gameActive = false;
        const scores = this.saveHighScore(this.score);
        const isNewRecord = scores.length > 0 && scores[0].score === this.score;
        
        document.querySelector('.final-score').textContent = this.score;
        const gameOverMessage = document.getElementById('gameOverMessage');
        
        if (isNewRecord) {
            gameOverMessage.querySelector('.message-title').textContent = 'Новый рекорд!';
        }
        
        gameOverMessage.classList.add('show');
    }

    handleTouchStart(e) {
        if (!this.gameActive || this.paused) return;
        
        const touch = e.touches[0];
        if (!this.ball.isLaunched) {
            this.ball.launch();
        }
        
        const container = this.canvas.getBoundingClientRect();
        const scale = this.gameWidth / container.width;
        const touchX = (touch.clientX - container.left) * scale;
        
        this.paddle.x = touchX - this.paddle.width / 2;
        this.clampPaddlePosition();
    }

    handleTouchMove(e) {
        if (!this.gameActive || this.paused) return;
        
        const touch = e.touches[0];
        const container = this.canvas.getBoundingClientRect();
        const scale = this.gameWidth / container.width;
        const touchX = (touch.clientX - container.left) * scale;
        
        this.paddle.x = touchX - this.paddle.width / 2;
        this.clampPaddlePosition();
    }

    clampPaddlePosition() {
        if (this.paddle.x < 0) this.paddle.x = 0;
        if (this.paddle.x + this.paddle.width > this.gameWidth) {
            this.paddle.x = this.gameWidth - this.paddle.width;
        }
    }

    handleMouseMove(e) {
        if (!this.gameActive || this.paused) return;

        const container = this.canvas.getBoundingClientRect();
        const scale = this.gameWidth / container.width;
        const mouseX = (e.clientX - container.left) * scale;
        
        this.paddle.x = mouseX - this.paddle.width / 2;
        this.clampPaddlePosition();
    }

    handleClick() {
        if (this.gameActive && !this.ball.isLaunched) {
            this.ball.launch();
        }
    }

    launchBall() {
        if (!this.ball.isLaunched) {
            this.ball.launch();
        }
    }

    activateCheatMode() {
        this.cheatMode = true;
        this.lives = 99;
        this.ballSpeed *= 0.75;
        this.paddleWidth *= 1.5;
        this.paddle.width = this.paddleWidth;

        // Создаем эффект активации
        for (let i = 0; i < 5; i++) {
            const emitter = this.particles.createEmitter({
                ...ParticleEffects.SPARKLE,
                x: Math.random() * this.gameWidth,
                y: Math.random() * this.gameHeight,
                particleColor: '#8A57F0'
            });
            setTimeout(() => this.particles.removeEmitter(emitter), 1000);
        }

        // Показываем сообщение
        const message = document.createElement('div');
        message.className = 'cheat-message';
        message.textContent = 'CHEAT MODE ACTIVATED!';
        document.body.appendChild(message);
        setTimeout(() => document.body.removeChild(message), 2000);
    }

    checkBrowserSupport() {
        try {
            // Проверка поддержки Canvas
            const canvas = document.createElement('canvas');
            const hasCanvas = !!(canvas.getContext && canvas.getContext('2d'));
            
            // Проверка поддержки Audio
            const hasAudio = !!(window.Audio);
            
            // Проверка поддержки requestAnimationFrame
            const hasRAF = !!(window.requestAnimationFrame || 
                            window.webkitRequestAnimationFrame || 
                            window.mozRequestAnimationFrame);

            // WebGL не обязателен для работы игры
            return hasCanvas && hasAudio && hasRAF;
        } catch (error) {
            console.error('Ошибка при проверке поддержки браузера:', error);
            return false;
        }
    }

    loadHighScores() {
        try {
            const scores = localStorage.getItem('arkanoidHighScores');
            return scores ? JSON.parse(scores) : [];
        } catch (error) {
            console.warn('Ошибка загрузки рекордов:', error);
            return [];
        }
    }

    saveHighScore(score) {
        try {
            const scores = this.loadHighScores();
            scores.push({
                score,
                date: new Date().toISOString(),
                level: this.level
            });
            
            // Сортируем по убыванию и оставляем только топ 10
            scores.sort((a, b) => b.score - a.score);
            const topScores = scores.slice(0, 10);
            
            localStorage.setItem('arkanoidHighScores', JSON.stringify(topScores));
            return topScores;
        } catch (error) {
            console.warn('Ошибка сохранения рекорда:', error);
            return [];
        }
    }

    showHighScores() {
        const scores = this.loadHighScores();
        const scoresHtml = scores.map((score, index) => `
            <div class="high-score">
                <span class="position">${index + 1}</span>
                <span class="score">${score.score}</span>
                <span class="level">Уровень ${score.level}</span>
                <span class="date">${new Date(score.date).toLocaleDateString()}</span>
            </div>
        `).join('');

        const message = document.createElement('div');
        message.className = 'high-scores-message game-message show';
        message.innerHTML = `
            <h2 class="message-title">Таблица рекордов</h2>
            <div class="high-scores-list">
                ${scoresHtml || '<p>Пока нет рекордов</p>'}
            </div>
            <button class="btn" onclick="this.parentElement.remove()">Закрыть</button>
        `;
        
        document.body.appendChild(message);
    }

    exitToMainMenu() {
        // Останавливаем игру
        this.gameActive = false;
        this.paused = false;
        
        // Скрываем все игровые сообщения
        document.querySelectorAll('.game-message').forEach(msg => {
            msg.classList.remove('show');
        });

        // Скрываем игровой контейнер
        document.querySelector('.game-container').classList.remove('active');

        // Останавливаем музыку
        this.audioManager.playSound('gameOver');
        
        // Сбрасываем состояние игры
        this.score = 0;
        this.lives = CONFIG.GAME.INITIAL_LIVES;
        this.level = 1;
        this.ballSpeed = CONFIG.BALL.INITIAL_SPEED;
        
        // Обновляем отображение счета и жизней
        document.querySelector('.score-value').textContent = '0';
        document.querySelector('.lives-value').textContent = CONFIG.GAME.INITIAL_LIVES;
        
        // Сбрасываем позиции объектов
        this.paddle.reset();
        this.ball.reset(this.paddle.x + this.paddle.width / 2, this.paddle.y - 10);
        this.createBlocks();
    }

    updateCustomCursor(e) {
        if (!this.gameActive || this.paused) return;

        const wrapper = this.canvas.parentElement;
        const cursor = wrapper.querySelector('::after');
        if (cursor) {
            const rect = wrapper.getBoundingClientRect();
            if (e.clientX >= rect.left && 
                e.clientX <= rect.right && 
                e.clientY >= rect.top && 
                e.clientY <= rect.bottom) {
                
                wrapper.style.setProperty('--cursor-x', `${e.clientX}px`);
                wrapper.style.setProperty('--cursor-y', `${e.clientY}px`);
            }
        }
    }

    createBall(x, y) {
        const ball = new Ball(this, x, y);
        return ball;
    }

    resetBall() {
        const newBall = this.createBall(
            this.paddle.x + this.paddle.width / 2,
            this.paddle.y - 10
        );
        this.balls = [newBall];
    }
} 