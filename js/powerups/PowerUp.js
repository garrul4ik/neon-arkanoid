import { ParticleEffects } from '../utils/particles.js';

export const PowerUpType = {
    BALL_SPLIT: 'BALL_SPLIT',
    PADDLE_SHRINK: 'PADDLE_SHRINK',
    PADDLE_EXTEND: 'PADDLE_EXTEND',
    BALL_SPEED: 'BALL_SPEED'
};

export class PowerUp {
    constructor(game, x, y, type) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = 20;
        this.height = 20;
        this.fallSpeed = 150;
        this.isCollected = false;
        
        // Настройки для разных типов бонусов
        this.settings = {
            [PowerUpType.BALL_SPLIT]: {
                color: '#4169E1', // Синий
                points: 300
            },
            [PowerUpType.PADDLE_SHRINK]: {
                color: '#FF4444', // Красный
                points: 150
            },
            [PowerUpType.PADDLE_EXTEND]: {
                color: '#44FF44', // Зеленый
                points: 200
            },
            [PowerUpType.BALL_SPEED]: {
                color: '#FFFF44', // Желтый
                points: 250
            }
        };
    }

    update(deltaTime) {
        if (this.isCollected) return;

        this.y += this.fallSpeed * deltaTime;

        // Проверяем столкновение с платформой
        if (this.checkPaddleCollision()) {
            this.collect();
        }

        // Проверяем выпадение за пределы экрана
        if (this.y > this.game.gameHeight) {
            this.isCollected = true;
        }
    }

    draw(ctx) {
        if (this.isCollected) return;

        const color = this.settings[this.type].color;
        
        // Рисуем звездочку
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(Date.now() / 1000); // Вращение
        
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5;
            const radius = i === 0 ? this.width / 2 : this.width / 4;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
    }

    checkPaddleCollision() {
        return (
            this.x < this.game.paddle.x + this.game.paddle.width &&
            this.x + this.width > this.game.paddle.x &&
            this.y < this.game.paddle.y + this.game.paddle.height &&
            this.y + this.height > this.game.paddle.y
        );
    }

    collect() {
        this.isCollected = true;
        const points = this.settings[this.type].points;
        this.game.score += points;

        // Создаем эффект сбора
        const emitter = this.game.particles.createEmitter({
            ...ParticleEffects.SPARKLE,
            x: this.x + this.width / 2,
            y: this.y + this.height / 2,
            particleColor: this.settings[this.type].color
        });
        setTimeout(() => this.game.particles.removeEmitter(emitter), 500);

        // Применяем эффект бонуса
        switch (this.type) {
            case PowerUpType.BALL_SPLIT:
                this.splitBalls();
                break;
            case PowerUpType.PADDLE_SHRINK:
                this.shrinkPaddle();
                break;
            case PowerUpType.PADDLE_EXTEND:
                this.extendPaddle();
                break;
            case PowerUpType.BALL_SPEED:
                this.increaseBallSpeed();
                break;
        }
    }

    splitBalls() {
        const newBalls = [];
        this.game.balls.forEach(ball => {
            const newBall = this.game.createBall(ball.x, ball.y);
            newBall.dx = -ball.dx;
            newBall.dy = ball.dy;
            newBall.isLaunched = true;
            newBalls.push(newBall);
        });
        this.game.balls.push(...newBalls);
    }

    shrinkPaddle() {
        const newWidth = this.game.paddle.width * 0.67; // Уменьшение на треть
        this.game.paddle.width = Math.max(50, newWidth); // Минимальная ширина
    }

    extendPaddle() {
        const newWidth = this.game.paddle.width * 1.33; // Увеличение на треть
        this.game.paddle.width = Math.min(200, newWidth); // Максимальная ширина
    }

    increaseBallSpeed() {
        this.game.balls.forEach(ball => {
            const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
            const newSpeed = speed * 1.5;
            const ratio = newSpeed / speed;
            ball.dx *= ratio;
            ball.dy *= ratio;
        });
    }
} 