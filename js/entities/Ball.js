import { checkCollision } from '../utils/collision.js';
import { ParticleEffects } from '../utils/particles.js';

export class Ball {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.radius = 8;
        this.speed = game.ballSpeed;
        this.dx = 0;
        this.dy = 0;
        this.isLaunched = false;
        this.trailParticles = [];
        this.lastTrailTime = 0;
        this.trailInterval = 50; // ms
        this.glowIntensity = 0;
        this.glowDirection = 1;
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.dx = 0;
        this.dy = 0;
        this.isLaunched = false;
        this.trailParticles = [];
    }

    launch() {
        if (!this.isLaunched) {
            this.isLaunched = true;
            this.dy = -this.speed;
            this.dx = (Math.random() - 0.5) * (this.speed / 2);
            this.game.audioManager.playSound('gameStart');
        }
    }

    update(deltaTime) {
        // Если мяч не запущен, следуем за платформой
        if (!this.isLaunched) {
            this.x = this.game.paddle.x + this.game.paddle.width / 2;
            this.y = this.game.paddle.y - this.radius - 1;
            return;
        }

        // Обновляем позицию
        this.x += this.dx * deltaTime;
        this.y += this.dy * deltaTime;

        // Проверяем столкновения со стенами
        if (this.x - this.radius <= 0 || this.x + this.radius >= this.game.gameWidth) {
            this.dx = -this.dx;
            this.createCollisionEffect('wall');
        }

        if (this.y - this.radius <= 0) {
            this.dy = -this.dy;
            this.createCollisionEffect('ceiling');
        }

        // Проверяем выпадение мяча
        if (this.y + this.radius > this.game.gameHeight) {
            this.game.lives--;
            if (this.game.lives > 0) {
                this.reset(this.game.paddle.x + this.game.paddle.width / 2, this.game.paddle.y - 10);
            }
            this.createCollisionEffect('fall');
        }

        // Обновляем свечение
        this.glowIntensity += 0.1 * this.glowDirection;
        if (this.glowIntensity >= 1) {
            this.glowDirection = -1;
        } else if (this.glowIntensity <= 0) {
            this.glowDirection = 1;
        }

        // Создаем частицы следа
        const now = Date.now();
        if (now - this.lastTrailTime > this.trailInterval) {
            this.createTrailParticle();
            this.lastTrailTime = now;
        }

        // Обновляем частицы следа
        this.trailParticles = this.trailParticles.filter(particle => {
            particle.life -= deltaTime;
            return particle.life > 0;
        });
    }

    draw(ctx) {
        // Рисуем след
        this.trailParticles.forEach(particle => {
            const alpha = particle.life;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(135, 206, 235, ${alpha})`;
            ctx.fill();
        });

        // Рисуем свечение
        const gradient = ctx.createRadialGradient(
            this.x, this.y, this.radius,
            this.x, this.y, this.radius * 2
        );
        gradient.addColorStop(0, `rgba(135, 206, 235, ${0.3 * this.glowIntensity})`);
        gradient.addColorStop(1, 'rgba(135, 206, 235, 0)');
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Рисуем мяч
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#87CEEB';
        ctx.fill();

        // Рисуем блик
        ctx.beginPath();
        ctx.arc(this.x - this.radius / 3, this.y - this.radius / 3, this.radius / 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
    }

    createTrailParticle() {
        this.trailParticles.push({
            x: this.x,
            y: this.y,
            radius: this.radius * 0.8,
            life: 1
        });
    }

    createCollisionEffect(type) {
        const effect = type === 'fall' ? ParticleEffects.EXPLOSION : ParticleEffects.SPARKLE;
        const emitter = this.game.particles.createEmitter({
            ...effect,
            x: this.x,
            y: this.y,
            particleColor: '#87CEEB'
        });
        setTimeout(() => this.game.particles.removeEmitter(emitter), 500);
    }

    checkCollision(paddle) {
        // Проверяем столкновение с платформой
        if (this.y + this.radius > paddle.y &&
            this.y - this.radius < paddle.y + paddle.height &&
            this.x + this.radius > paddle.x &&
            this.x - this.radius < paddle.x + paddle.width) {

            // Воспроизводим звук
            this.game.audioManager.playSound('paddle');

            // Отскок от платформы
            this.y = paddle.y - this.radius;
            
            // Вычисляем точку удара относительно центра платформы
            const hitPoint = (this.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
            
            // Изменяем угол отскока в зависимости от точки удара
            const maxAngle = Math.PI / 3; // 60 градусов
            const newAngle = hitPoint * maxAngle;
            
            const speed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
            this.dx = Math.sin(newAngle) * speed;
            this.dy = -Math.cos(newAngle) * speed;

            return true;
        }

        // Проверяем столкновение со стенами
        if (this.x - this.radius <= 0) {
            this.x = this.radius;
            this.dx = Math.abs(this.dx);
            this.game.audioManager.playSound('wall');
        } else if (this.x + this.radius >= this.game.gameWidth) {
            this.x = this.game.gameWidth - this.radius;
            this.dx = -Math.abs(this.dx);
            this.game.audioManager.playSound('wall');
        }

        if (this.y - this.radius <= 0) {
            this.y = this.radius;
            this.dy = Math.abs(this.dy);
            this.game.audioManager.playSound('wall');
        }

        // Проверяем падение мяча
        if (this.y - this.radius > this.game.gameHeight) {
            this.game.lives--;
            this.game.audioManager.playSound('lifeLost');
            
            if (this.game.lives <= 0) {
                this.game.gameOver();
            } else {
                this.reset(paddle.x + paddle.width / 2, paddle.y - this.radius);
            }
            return true;
        }

        return false;
    }
} 