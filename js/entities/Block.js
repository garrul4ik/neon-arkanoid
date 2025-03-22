import { checkCollision } from '../utils/collision.js';
import { ParticleEffects } from '../utils/particles.js';
import { PowerUp, PowerUpType } from '../powerups/PowerUp.js';

export class Block {
    constructor(game, x, y, width, height, type = 'normal') {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
        this.health = this.getInitialHealth();
        this.maxHealth = this.health;
        this.isDestroyed = false;
        this.glowIntensity = 0;
        this.glowDirection = 1;
        this.hitAnimationTime = 0;
        this.hitAnimationDuration = 200; // ms
        this.powerUpChance = 0.1; // 10% шанс выпадения усиления
        
        // Если это обычный блок, выбираем случайный цвет
        if (type === 'normal') {
            this.color = this.getRandomNeonColor();
        }
    }

    getInitialHealth() {
        switch (this.type) {
            case 'hard':
                return 2;
            case 'unbreakable':
                return Infinity;
            default:
                return 1;
        }
    }

    getRandomNeonColor() {
        const neonColors = [
            '#FF00FF', // Неоновый розовый
            '#00FF00', // Неоновый зеленый
            '#00FFFF', // Неоновый голубой
            '#FF0066', // Неоновый малиновый
            '#FF3300', // Неоновый оранжевый
            '#FF66FF', // Неоновый фиолетовый
            '#33FF33', // Яркий зеленый
            '#3366FF', // Неоновый синий
            '#FFFF00', // Неоновый желтый
            '#FF3399'  // Неоновый коралловый
        ];
        return neonColors[Math.floor(Math.random() * neonColors.length)];
    }

    getColor() {
        if (this.type === 'normal' && this.color) {
            return this.color;
        }

        const colors = {
            normal: '#87CEEB', // Этот цвет не будет использоваться, так как у normal свой случайный цвет
            hard: '#FF3300',   // Неоновый оранжевый для прочных блоков
            unbreakable: '#FFFFFF' // Белый для неразрушаемых блоков
        };
        return colors[this.type] || colors.normal;
    }

    update(deltaTime) {
        // Обновляем свечение
        this.glowIntensity += 0.1 * this.glowDirection;
        if (this.glowIntensity >= 1) {
            this.glowDirection = -1;
        } else if (this.glowIntensity <= 0) {
            this.glowDirection = 1;
        }

        // Обновляем анимацию удара
        if (this.hitAnimationTime > 0) {
            this.hitAnimationTime = Math.max(0, this.hitAnimationTime - deltaTime * 1000);
        }
    }

    draw(ctx) {
        if (this.isDestroyed) return;

        const color = this.getColor();
        const rgb = this.hexToRgb(color);

        // Рисуем свечение
        const glowAlpha = this.hitAnimationTime > 0 
            ? 0.5 * (this.hitAnimationTime / this.hitAnimationDuration)
            : 0.3 * this.glowIntensity;

        const gradient = ctx.createRadialGradient(
            this.x + this.width / 2, this.y + this.height / 2, 0,
            this.x + this.width / 2, this.y + this.height / 2, this.width / 2
        );
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${glowAlpha})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - 5, this.y - 5, this.width + 10, this.height + 10);

        // Рисуем блок
        ctx.fillStyle = color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Рисуем индикатор прочности для твердых блоков
        if (this.type === 'hard' && this.health < this.maxHealth) {
            const healthBarWidth = this.width * 0.8;
            const healthBarHeight = 3;
            const healthBarX = this.x + (this.width - healthBarWidth) / 2;
            const healthBarY = this.y + this.height - healthBarHeight - 2;

            // Фон индикатора
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

            // Заполнение индикатора
            ctx.fillStyle = color;
            ctx.fillRect(
                healthBarX,
                healthBarY,
                healthBarWidth * (this.health / this.maxHealth),
                healthBarHeight
            );
        }

        // Рисуем блики
        const gradient2 = ctx.createLinearGradient(
            this.x,
            this.y,
            this.x,
            this.y + this.height
        );
        gradient2.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient2.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient2;
        ctx.fillRect(this.x, this.y, this.width, this.height / 2);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    checkCollision(ball) {
        if (this.isDestroyed) return false;

        const collision = checkCollision(
            { x: ball.x - ball.radius, y: ball.y - ball.radius, width: ball.radius * 2, height: ball.radius * 2 },
            { x: this.x, y: this.y, width: this.width, height: this.height }
        );

        if (collision) {
            // Определяем сторону столкновения
            const ballCenterX = ball.x;
            const ballCenterY = ball.y;
            const blockCenterX = this.x + this.width / 2;
            const blockCenterY = this.y + this.height / 2;

            const dx = Math.abs(ballCenterX - blockCenterX);
            const dy = Math.abs(ballCenterY - blockCenterY);

            if (dx / this.width > dy / this.height) {
                ball.dx = -ball.dx;
            } else {
                ball.dy = -ball.dy;
            }

            // Обрабатываем попадание
            this.hit();
            return true;
        }

        return false;
    }

    hit() {
        if (this.type === 'unbreakable') {
            this.game.audioManager.playSound('hit');
            return;
        }

        this.health--;
        this.hitAnimationTime = this.hitAnimationDuration;

        // Воспроизводим звук удара
        this.game.audioManager.playSound(this.health <= 0 ? 'break' : 'hit');

        // Создаем эффект удара
        const emitter = this.game.particles.createEmitter({
            ...ParticleEffects.HIT,
            x: this.x + this.width / 2,
            y: this.y + this.height / 2,
            particleColor: this.getColor()
        });
        setTimeout(() => this.game.particles.removeEmitter(emitter), 300);

        if (this.health <= 0) {
            this.destroy();
        }
    }

    destroy() {
        this.isDestroyed = true;
        this.game.score += this.type === 'hard' ? 20 : 10;

        // Создаем эффект разрушения
        const emitter = this.game.particles.createEmitter({
            ...ParticleEffects.EXPLOSION,
            x: this.x + this.width / 2,
            y: this.y + this.height / 2,
            particleColor: this.getColor()
        });
        setTimeout(() => this.game.particles.removeEmitter(emitter), 1000);

        // Шанс выпадения бонуса
        if (Math.random() < CONFIG.POWERUPS.DROP_CHANCE && this.type !== 'unbreakable') {
            const randomType = CONFIG.POWERUPS.TYPES[Math.floor(Math.random() * CONFIG.POWERUPS.TYPES.length)];
            const powerUp = new PowerUp(
                this.game,
                this.x + this.width / 2 - 10, // Центрируем бонус
                this.y + this.height / 2 - 10,
                randomType
            );
            this.game.powerUps.push(powerUp);
        }
    }
} 