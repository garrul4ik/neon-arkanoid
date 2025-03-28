# Неоновый Арканоид

Современная реализация классической игры Арканоид с неоновой графикой и визуальными эффектами.

## Особенности

- 🎮 Плавный геймплей с физикой отражений
- 🌈 Неоновая графика и визуальные эффекты
- 🎵 Динамические звуковые эффекты
- 🎨 Различные типы блоков с уникальными свойствами
- ✨ Система частиц для визуальных эффектов
- 📱 Полная поддержка мобильных устройств
- 🎯 Оптимизированное сенсорное управление
- 🖥️ Адаптивный дизайн для всех размеров экрана
- ⌨️ Поддержка управления с клавиатуры и мыши
- 🎪 Стильный брендинг MrG Studio
- 🚀 Современный неоновый интерфейс

## Управление

### На компьютере:
- `←` / `→` или движение мыши - перемещение платформы
- `Пробел` или клик мыши - запуск мяча
- `P` или `Escape` - пауза
- `M` - включение/выключение музыки
- `S` - включение/выключение звуковых эффектов

### На мобильных устройствах:
- Слайд пальцем - перемещение платформы
- Тап по экрану - запуск мяча
- Кнопки на экране - пауза, выход, управление звуком

## Интерфейс

- 🎯 Адаптивный логотип MrG Studio
- 🎮 Стилизованные неоновые кнопки
- 📊 Счёт и жизни в верхней панели
- ⏸️ Меню паузы с возможностью выхода в главное меню
- 🏆 Экран окончания игры с результатом

## Типы блоков

- 🟦 Обычные блоки - разрушаются с одного удара
- 🟪 Прочные блоки - требуют несколько ударов
- 🟥 Неразрушаемые блоки - отражают мяч

## Установка и запуск

1. Клонируйте репозиторий:
```bash
git clone https://github.com/garrul4ik/neon-arkanoid.git
```

2. Откройте `index.html` в современном браузере

## Технологии

- HTML5 Canvas для рендеринга
- Web Audio API для звуковых эффектов
- Чистый JavaScript без зависимостей
- CSS для анимаций и визуальных эффектов
- Touch Events API для мобильного управления

## Структура проекта

```
.
├── assets/
│   └── images/
│       └── mrg-studio-logo.png
├── css/
│   ├── main.css
│   └── components/
│       ├── game.css
│       └── animations.css
├── js/
│   ├── core/
│   │   ├── Game.js
│   │   └── Audio.js
│   ├── entities/
│   │   ├── Ball.js
│   │   ├── Paddle.js
│   │   └── Block.js
│   └── utils/
│       ├── collision.js
│       └── particles.js
└── index.html
```

## Оптимизация

- Адаптивный дизайн для всех устройств
- Оптимизированное управление на мобильных устройствах
- Эффективная система обнаружения столкновений
- Плавная анимация с использованием requestAnimationFrame
- Оптимизированная система частиц
- Кэширование звуковых эффектов
- Адаптивные размеры интерфейса

## Будущие улучшения

- [ ] Добавление системы уровней
- [ ] Новые типы блоков и бонусов
- [ ] Таблица рекордов
- [ ] Сохранение прогресса
- [ ] Мультиплеер
- [ ] Дополнительные визуальные эффекты
- [ ] Новые режимы игры

## Лицензия

MIT License - свободно используйте для личных и коммерческих проектов. 