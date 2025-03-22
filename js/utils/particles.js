import { CONFIG } from '../config.js';

export const ParticleEffects = {
    EXPLOSION: {
        particleCount: 30,
        minSpeed: 100,
        maxSpeed: 300,
        minSize: 2,
        maxSize: 6,
        lifetime: 1000
    },
    SPARKLE: {
        particleCount: 10,
        minSpeed: 50,
        maxSpeed: 150,
        minSize: 1,
        maxSize: 3,
        lifetime: 500
    },
    TRAIL: {
        particleCount: 1,
        particleLifetime: 0.3,
        particleSpeed: { min: 0, max: 0 },
        particleSize: { min: 2, max: 3 },
        spread: 0,
        gravity: 0,
        fadeOut: true
    },
    HIT: {
        particleCount: 5,
        minSpeed: 50,
        maxSpeed: 100,
        minSize: 1,
        maxSize: 2,
        lifetime: 300
    }
};

class ParticlePool {
    constructor(size) {
        this.pool = [];
        this.activeParticles = new Set();
        
        // Предварительно создаем частицы
        for (let i = 0; i < size; i++) {
            this.pool.push(new Particle());
        }
    }

    get(x, y, color, velocity, size, lifetime) {
        let particle;
        
        // Пытаемся взять частицу из пула
        if (this.pool.length > 0) {
            particle = this.pool.pop();
        } else {
            // Если пул пуст, берем самую старую активную частицу
            const oldestParticle = Array.from(this.activeParticles)[0];
            if (oldestParticle) {
                this.activeParticles.delete(oldestParticle);
                particle = oldestParticle;
            } else {
                // Если нет доступных частиц, создаем новую
                particle = new Particle();
            }
        }

        // Инициализируем частицу
        particle.init(x, y, color, velocity, size, lifetime);
        this.activeParticles.add(particle);
        return particle;
    }

    release(particle) {
        this.activeParticles.delete(particle);
        this.pool.push(particle);
    }

    update(deltaTime) {
        for (const particle of this.activeParticles) {
            particle.update(deltaTime);
            if (particle.isDead) {
                this.release(particle);
            }
        }
    }

    draw(ctx) {
        for (const particle of this.activeParticles) {
            particle.draw(ctx);
        }
    }
}

class Particle {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.size = 0;
        this.color = '';
        this.lifetime = 0;
        this.age = 0;
        this.isDead = true;
    }

    init(x, y, color, velocity, size, lifetime) {
        this.x = x;
        this.y = y;
        this.vx = velocity.x;
        this.vy = velocity.y;
        this.color = color;
        this.size = size;
        this.lifetime = lifetime;
        this.age = 0;
        this.isDead = false;
    }

    update(deltaTime) {
        this.age += deltaTime;
        if (this.age >= this.lifetime) {
            this.isDead = true;
            return;
        }

        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        // Затухание
        const lifePercent = this.age / this.lifetime;
        this.size *= (1 - lifePercent * 0.1);
        this.vx *= (1 - lifePercent * 0.1);
        this.vy *= (1 - lifePercent * 0.1);
    }

    draw(ctx) {
        const alpha = 1 - (this.age / this.lifetime);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

export class ParticleSystem {
    constructor() {
        this.pool = new ParticlePool(CONFIG.PARTICLES.MAX_PARTICLES);
        this.emitters = new Set();
    }

    createEmitter(options) {
        const emitter = {
            id: Math.random().toString(36).substr(2, 9),
            particles: []
        };

        const {
            x, y,
            particleCount = 20,
            particleColor = '#ffffff',
            minSpeed = CONFIG.PARTICLES.MIN_SPEED,
            maxSpeed = CONFIG.PARTICLES.MAX_SPEED,
            minSize = CONFIG.PARTICLES.MIN_SIZE,
            maxSize = CONFIG.PARTICLES.MAX_SIZE,
            lifetime = CONFIG.PARTICLES.LIFETIME
        } = options;

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
            const size = minSize + Math.random() * (maxSize - minSize);
            
            const velocity = {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed
            };

            const particle = this.pool.get(x, y, particleColor, velocity, size, lifetime);
            emitter.particles.push(particle);
        }

        this.emitters.add(emitter);
        return emitter;
    }

    removeEmitter(emitter) {
        if (emitter && this.emitters.has(emitter)) {
            emitter.particles.forEach(particle => {
                particle.isDead = true;
            });
            this.emitters.delete(emitter);
        }
    }

    update(deltaTime) {
        this.pool.update(deltaTime);
        
        // Очищаем эмиттеры без частиц
        for (const emitter of this.emitters) {
            emitter.particles = emitter.particles.filter(p => !p.isDead);
            if (emitter.particles.length === 0) {
                this.emitters.delete(emitter);
            }
        }
    }

    draw(ctx) {
        this.pool.draw(ctx);
    }
} 