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

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const blockType = pattern[row][col];
                let type = 'normal';
                
                switch(blockType) {
                    case 'H': type = 'hard'; break;
                    case 'U': type = 'unbreakable'; break;
                    case 'N': type = 'normal'; break;
                    case 'X': continue; // пустое место
                }

                const block = new Block(
                    this,
                    leftOffset + col * (blockWidth + padding),
                    topOffset + row * (blockHeight + padding),
                    blockWidth,
                    blockHeight,
                    type
                );
                this.blocks.push(block);
            }
        }
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
        this.draw();

        // Следующий кадр
        requestAnimationFrame(this.gameLoop);
    }

    update(deltaTime) {
        // Обновляем объекты
        this.paddle.update(deltaTime);
        this.ball.update(deltaTime);
        this.particles.update(deltaTime);

        // Проверяем столкновения
        this.ball.checkCollision(this.paddle);

        this.blocks.forEach(block => {
            block.update(deltaTime);
            if (block.checkCollision(this.ball)) {
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

        // Удаляем разрушенные блоки
        this.blocks = this.blocks.filter(block => !block.isDestroyed);

        // Проверяем условия победы/поражения
        this.checkGameStatus();
    }

    draw() {
        // Рисуем фон
        this.ctx.fillStyle = '#0A0A12';
        this.ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);

        // Рисуем объекты
        this.blocks.forEach(block => block.draw(this.ctx));
        this.paddle.draw(this.ctx);
        this.ball.draw(this.ctx);
        this.particles.draw(this.ctx);

        // Обновляем UI
        document.querySelector('.score-value').textContent = this.score;
        document.querySelector('.lives-value').textContent = this.lives;
    }

    checkGameStatus() {
        // Проверяем победу
        const remainingBlocks = this.blocks.filter(block => block.type !== 'unbreakable').length;
        if (remainingBlocks === 0) {
            this.levelComplete();
        }

        // Проверяем поражение
        if (this.lives <= 0) {
            this.gameOver();
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
} 