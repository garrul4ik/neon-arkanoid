export const CONFIG = {
    // Размеры игрового поля
    GAME_WIDTH: 800,
    GAME_HEIGHT: 600,

    // Настройки платформы
    PADDLE: {
        WIDTH: 100,
        HEIGHT: 20,
        SPEED: 600,
        COLOR: '#00ff00'
    },

    // Настройки мяча
    BALL: {
        SIZE: 8,
        INITIAL_SPEED: 300,
        SPEED_INCREASE: 20,
        MAX_SPEED: 600,
        COLOR: '#ff0000'
    },

    // Настройки блоков
    BLOCK: {
        WIDTH: 60,
        HEIGHT: 20,
        PADDING: 10,
        ROWS: 8,
        TYPES: {
            NORMAL: {
                HEALTH: 1,
                SCORE: 50,
                COLOR: '#0088ff'
            },
            HARD: {
                HEALTH: 2,
                SCORE: 100,
                COLOR: '#ff8800'
            },
            UNBREAKABLE: {
                HEALTH: Infinity,
                SCORE: 0,
                COLOR: '#888888'
            }
        }
    },

    // Настройки игры
    GAME: {
        INITIAL_LIVES: 3,
        EXTRA_LIFE_SCORE: 10000,
        LEVEL_SCORE_MULTIPLIER: 1.5
    },

    // Настройки частиц
    PARTICLES: {
        MAX_PARTICLES: 50,
        LIFETIME: 500,
        MIN_SPEED: 25,
        MAX_SPEED: 100,
        MIN_SIZE: 1,
        MAX_SIZE: 3
    },

    // Настройки звука
    AUDIO: {
        MUSIC_VOLUME: 0.5,
        SFX_VOLUME: 0.7
    },

    // Настройки бонусов
    POWERUPS: {
        DROP_CHANCE: 0.3, // 30% шанс выпадения бонуса из блока
        TYPES: ['BALL_SPLIT', 'PADDLE_SHRINK', 'PADDLE_EXTEND', 'BALL_SPEED'],
        FALL_SPEED: 150
    },

    // Уровни
    LEVELS: [
        {
            name: "Классический",
            pattern: [
                "UXXXXXXU",
                "HHHHHHHH",
                "NNNNNNNN",
                "NNNNNNNN",
                "NNNNNNNN"
            ]
        },
        {
            name: "Крепость",
            pattern: [
                "UHHHHHHU",
                "HNNNNNNH",
                "HNNNNNNH",
                "HNNNNNNH",
                "UHHHHHHU"
            ]
        },
        {
            name: "Лабиринт",
            pattern: [
                "UNUNUNUN",
                "NUNUNUNU",
                "UNUNUNUN",
                "NUNUNUNU",
                "UNUNUNUN"
            ]
        }
    ]
}; 