import { ParticleEffects } from '../utils/particles.js';

export class Paddle {
    constructor(game) {
        this.game = game;
        this.width = game.paddleWidth;
        this.height = 20;
        this.x = game.gameWidth / 2 - this.width / 2;
        this.y = game.gameHeight - this.height - 10;
        this.maxSpeed = 1000;
        this.currentSpeed = 0;
        this.acceleration = 2000;
        this.deceleration = 3000;
        this.glowIntensity = 0;
        this.glowDirection = 1;
        this.lastEmitterTime = 0;
        this.emitterInterval = 100; // ms
    }

    reset() {
        this.x = this.game.gameWidth / 2 - this.width / 2;
        this.currentSpeed = 0;
    }

    update(deltaTime) {
        // Обновляем свечение
        this.glowIntensity += 0.1 * this.glowDirection;
        if (this.glowIntensity >= 1) {
            this.glowDirection = -1;
        } else if (this.glowIntensity <= 0) {
            this.glowDirection = 1;
        }

        // Создаем эффект движения
        const now = Date.now();
        if (Math.abs(this.currentSpeed) > 100 && now - this.lastEmitterTime > this.emitterInterval) {
            this.createMovementEffect();
            this.lastEmitterTime = now;
        }

        // Применяем замедление
        if (this.currentSpeed > 0) {
            this.currentSpeed = Math.max(0, this.currentSpeed - this.deceleration * deltaTime);
        } else if (this.currentSpeed < 0) {
            this.currentSpeed = Math.min(0, this.currentSpeed + this.deceleration * deltaTime);
        }

        // Обновляем позицию
        this.x += this.currentSpeed * deltaTime;

        // Ограничиваем движение
        if (this.x < 0) {
            this.x = 0;
            this.currentSpeed = 0;
        }
        if (this.x + this.width > this.game.gameWidth) {
            this.x = this.game.gameWidth - this.width;
            this.currentSpeed = 0;
        }
    }

    draw(ctx) {
        // Рисуем свечение
        const gradient = ctx.createLinearGradient(
            this.x, this.y - this.height,
            this.x, this.y + this.height * 2
        );
        gradient.addColorStop(0, `rgba(135, 206, 235, ${0.3 * this.glowIntensity})`);
        gradient.addColorStop(1, 'rgba(135, 206, 235, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - 10, this.y - 10, this.width + 20, this.height + 20);

        // Рисуем платформу
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Рисуем блики
        const gradient2 = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient2.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient2.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient2;
        ctx.fillRect(this.x, this.y, this.width, this.height / 2);

        // Рисуем края
        ctx.fillStyle = '#5F9EA0';
        ctx.fillRect(this.x, this.y, 5, this.height);
        ctx.fillRect(this.x + this.width - 5, this.y, 5, this.height);
    }

    createMovementEffect() {
        const direction = Math.sign(this.currentSpeed);
        const x = direction > 0 ? this.x : this.x + this.width;
        const emitter = this.game.particles.createEmitter({
            ...ParticleEffects.TRAIL,
            x: x,
            y: this.y + this.height / 2,
            particleColor: '#87CEEB',
            direction: direction > 0 ? Math.PI : 0
        });
        setTimeout(() => this.game.particles.removeEmitter(emitter), 200);
    }

    moveLeft(deltaTime) {
        this.currentSpeed = Math.max(-this.maxSpeed, this.currentSpeed - this.acceleration * deltaTime);
    }

    moveRight(deltaTime) {
        this.currentSpeed = Math.min(this.maxSpeed, this.currentSpeed + this.acceleration * deltaTime);
    }
} 