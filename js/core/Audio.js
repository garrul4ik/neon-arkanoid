export class AudioManager {
    constructor() {
        this.sounds = new Map();
        this.music = new Map();
        this.isMusicEnabled = true;
        this.isSFXEnabled = true;
        this.currentMusic = null;
        this.loadingPromises = [];
        this.musicVolume = 0.5;
        this.soundVolume = 0.7;
    }

    async init() {
        try {
            // Загрузка звуков
            const soundFiles = {
                hit: 'sounds/block-hit.wav',
                break: 'sounds/block-break.wav',
                paddle: 'sounds/paddle.wav',
                wall: 'sounds/wall.wav',
                gameOver: 'sounds/game-over.wav',
                gameStart: 'sounds/game-start.wav',
                levelComplete: 'sounds/level-complete.wav',
                lifeLost: 'sounds/life-lost.wav',
                powerUp: 'sounds/power-up.wav'
            };

            const musicFiles = {
                background: 'sounds/background.wav'
            };

            // Загружаем звуки
            for (const [name, path] of Object.entries(soundFiles)) {
                this.loadingPromises.push(
                    this.loadSound(path)
                        .then(audio => this.sounds.set(name, audio))
                        .catch(error => {
                            console.warn(`Не удалось загрузить звук ${name}: ${error.message}`);
                            return null;
                        })
                );
            }

            // Загружаем музыку
            for (const [name, path] of Object.entries(musicFiles)) {
                this.loadingPromises.push(
                    this.loadSound(path)
                        .then(audio => {
                            audio.loop = true;
                            this.music.set(name, audio);
                        })
                        .catch(error => {
                            console.warn(`Не удалось загрузить музыку ${name}: ${error.message}`);
                            return null;
                        })
                );
            }

            // Ждем загрузки всех аудио файлов
            await Promise.allSettled(this.loadingPromises);
            
            // Проверяем, загрузились ли критически важные звуки
            if (this.sounds.size === 0 && this.music.size === 0) {
                throw new Error('Не удалось загрузить ни один аудио файл');
            }

        } catch (error) {
            console.error('Ошибка инициализации аудио:', error);
            this.isMusicEnabled = false;
            this.isSFXEnabled = false;
        }
    }

    loadSound(path) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.addEventListener('canplaythrough', () => resolve(audio), { once: true });
            audio.addEventListener('error', () => reject(new Error(`Ошибка загрузки ${path}`)), { once: true });
            audio.src = path;
        });
    }

    playSound(name) {
        if (!this.isSFXEnabled) return;
        
        const sound = this.sounds.get(name);
        if (sound) {
            try {
                // Создаем клон для возможности одновременного воспроизведения
                const clone = sound.cloneNode();
                clone.volume = this.soundVolume;
                clone.play().catch(error => {
                    console.warn(`Ошибка воспроизведения звука ${name}:`, error);
                });
            } catch (error) {
                console.warn(`Ошибка клонирования звука ${name}:`, error);
            }
        }
    }

    playMusic(name) {
        if (!this.isMusicEnabled) return;
        
        const music = this.music.get(name);
        if (music) {
            try {
                if (this.currentMusic) {
                    this.currentMusic.pause();
                    this.currentMusic.currentTime = 0;
                }
                this.currentMusic = music;
                music.volume = this.musicVolume;
                music.play().catch(error => {
                    console.warn(`Ошибка воспроизведения музыки ${name}:`, error);
                });
            } catch (error) {
                console.warn(`Ошибка воспроизведения музыки ${name}:`, error);
            }
        }
    }

    toggleMusic() {
        this.isMusicEnabled = !this.isMusicEnabled;
        if (!this.isMusicEnabled && this.currentMusic) {
            this.currentMusic.pause();
        } else if (this.isMusicEnabled && this.currentMusic) {
            this.currentMusic.play().catch(console.warn);
        }
        return this.isMusicEnabled;
    }

    toggleSFX() {
        this.isSFXEnabled = !this.isSFXEnabled;
        return this.isSFXEnabled;
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.currentMusic) {
            this.currentMusic.volume = this.musicVolume;
        }
    }

    setSoundVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume));
    }

    fadeIn(audio, targetVolume, duration) {
        const steps = 20;
        const stepDuration = duration / steps;
        const stepVolume = targetVolume / steps;
        let currentStep = 0;

        const fadeInterval = setInterval(() => {
            currentStep++;
            audio.volume = Math.min(targetVolume, stepVolume * currentStep);
            
            if (currentStep >= steps) {
                clearInterval(fadeInterval);
            }
        }, stepDuration);
    }

    fadeOut(audio, duration) {
        return new Promise(resolve => {
            const startVolume = audio.volume;
            const steps = 20;
            const stepDuration = duration / steps;
            const stepVolume = startVolume / steps;
            let currentStep = 0;

            const fadeInterval = setInterval(() => {
                currentStep++;
                audio.volume = Math.max(0, startVolume - stepVolume * currentStep);
                
                if (currentStep >= steps) {
                    clearInterval(fadeInterval);
                    resolve();
                }
            }, stepDuration);
        });
    }

    // Специальные звуковые эффекты
    playPowerUpSound() {
        // Воспроизводим звук с повышенным тоном
        const sound = this.sounds.get('powerUp');
        if (sound) {
            const clone = sound.cloneNode();
            clone.volume = this.soundVolume;
            clone.playbackRate = 1.5;
            clone.play().catch(console.warn);
        }
    }

    playGameOverSound() {
        // Останавливаем музыку с затуханием
        this.fadeOut(this.currentMusic, 2000).then(() => {
            // Воспроизводим звук окончания игры
            const sound = this.sounds.get('gameOver');
            if (sound) {
                sound.volume = this.soundVolume;
                sound.play().catch(console.warn);
            }
        });
    }

    playLevelCompleteSound() {
        // Временно уменьшаем громкость музыки
        const originalVolume = this.currentMusic.volume;
        this.currentMusic.volume = originalVolume * 0.3;

        // Воспроизводим звук завершения уровня
        const sound = this.sounds.get('levelComplete');
        if (sound) {
            sound.volume = this.soundVolume;
            sound.play().catch(console.warn);
        }

        // Возвращаем исходную громкость музыки
        setTimeout(() => {
            this.fadeIn(this.currentMusic, originalVolume, 1000);
        }, 2000);
    }
} 