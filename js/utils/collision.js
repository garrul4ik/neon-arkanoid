/**
 * Проверяет столкновение между двумя прямоугольниками
 * @param {Object} rect1 - Первый прямоугольник {x, y, width, height}
 * @param {Object} rect2 - Второй прямоугольник {x, y, width, height}
 * @returns {boolean} - true если есть столкновение, false если нет
 */
export function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

/**
 * Проверяет столкновение между точкой и прямоугольником
 * @param {Object} point - Точка {x, y}
 * @param {Object} rect - Прямоугольник {x, y, width, height}
 * @returns {boolean} - true если есть столкновение, false если нет
 */
export function checkPointCollision(point, rect) {
    return point.x >= rect.x &&
           point.x <= rect.x + rect.width &&
           point.y >= rect.y &&
           point.y <= rect.y + rect.height;
}

/**
 * Проверяет столкновение между окружностью и прямоугольником
 * @param {Object} circle - Окружность {x, y, radius}
 * @param {Object} rect - Прямоугольник {x, y, width, height}
 * @returns {boolean} - true если есть столкновение, false если нет
 */
export function checkCircleRectCollision(circle, rect) {
    // Находим ближайшую точку прямоугольника к центру окружности
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

    // Вычисляем расстояние между центром окружности и ближайшей точкой
    const distanceX = circle.x - closestX;
    const distanceY = circle.y - closestY;
    const distanceSquared = distanceX * distanceX + distanceY * distanceY;

    return distanceSquared <= circle.radius * circle.radius;
}

/**
 * Проверяет столкновение между двумя окружностями
 * @param {Object} circle1 - Первая окружность {x, y, radius}
 * @param {Object} circle2 - Вторая окружность {x, y, radius}
 * @returns {boolean} - true если есть столкновение, false если нет
 */
export function checkCircleCollision(circle1, circle2) {
    const dx = circle1.x - circle2.x;
    const dy = circle1.y - circle2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= circle1.radius + circle2.radius;
}

/**
 * Определяет сторону столкновения между двумя прямоугольниками
 * @param {Object} rect1 - Первый прямоугольник {x, y, width, height}
 * @param {Object} rect2 - Второй прямоугольник {x, y, width, height}
 * @returns {string} - 'top', 'bottom', 'left', 'right' или null если нет столкновения
 */
export function getCollisionSide(rect1, rect2) {
    if (!checkCollision(rect1, rect2)) return null;

    const dx = (rect1.x + rect1.width / 2) - (rect2.x + rect2.width / 2);
    const dy = (rect1.y + rect1.height / 2) - (rect2.y + rect2.height / 2);
    const width = (rect1.width + rect2.width) / 2;
    const height = (rect1.height + rect2.height) / 2;
    const crossWidth = width * dy;
    const crossHeight = height * dx;

    if (Math.abs(dx) <= width && Math.abs(dy) <= height) {
        if (crossWidth > crossHeight) {
            return crossWidth > -crossHeight ? 'bottom' : 'left';
        } else {
            return crossWidth > -crossHeight ? 'right' : 'top';
        }
    }
    return null;
}

/**
 * Определяет точку столкновения между двумя прямоугольниками
 * @param {Object} rect1 - Первый прямоугольник {x, y, width, height}
 * @param {Object} rect2 - Второй прямоугольник {x, y, width, height}
 * @returns {Object|null} - {x, y} координаты точки столкновения или null если нет столкновения
 */
export function getCollisionPoint(rect1, rect2) {
    const side = getCollisionSide(rect1, rect2);
    if (!side) return null;

    switch (side) {
        case 'top':
            return {
                x: rect1.x + rect1.width / 2,
                y: rect2.y
            };
        case 'bottom':
            return {
                x: rect1.x + rect1.width / 2,
                y: rect2.y + rect2.height
            };
        case 'left':
            return {
                x: rect2.x,
                y: rect1.y + rect1.height / 2
            };
        case 'right':
            return {
                x: rect2.x + rect2.width,
                y: rect1.y + rect1.height / 2
            };
    }
}

/**
 * Проверяет, находится ли точка внутри многоугольника
 * @param {Object} point - Точка {x, y}
 * @param {Array} polygon - Массив точек многоугольника [{x, y}, ...]
 * @returns {boolean} - true если точка внутри многоугольника, false если нет
 */
export function checkPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        
        const intersect = ((yi > point.y) !== (yj > point.y))
            && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

/**
 * Вычисляет угол отражения
 * @param {number} incidentAngle - Угол падения в радианах
 * @param {number} surfaceAngle - Угол поверхности в радианах
 * @returns {number} - Угол отражения в радианах
 */
export function calculateReflectionAngle(incidentAngle, surfaceAngle) {
    return 2 * surfaceAngle - incidentAngle;
}

/**
 * Проверяет пересечение двух линий
 * @param {Object} line1 - Первая линия {x1, y1, x2, y2}
 * @param {Object} line2 - Вторая линия {x1, y1, x2, y2}
 * @returns {Object|null} - Точка пересечения {x, y} или null если нет пересечения
 */
export function checkLineIntersection(line1, line2) {
    const x1 = line1.x1, y1 = line1.y1;
    const x2 = line1.x2, y2 = line1.y2;
    const x3 = line2.x1, y3 = line2.y1;
    const x4 = line2.x2, y4 = line2.y2;

    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denominator === 0) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return {
            x: x1 + t * (x2 - x1),
            y: y1 + t * (y2 - y1)
        };
    }
    return null;
}

export function getCollisionNormal(circle, rect) {
    // Находим ближайшую точку прямоугольника к центру круга
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

    // Вычисляем вектор от ближайшей точки к центру круга
    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    const length = Math.sqrt(dx * dx + dy * dy);

    // Нормализуем вектор
    return {
        x: length > 0 ? dx / length : 0,
        y: length > 0 ? dy / length : 0
    };
}

export function reflectVector(vector, normal) {
    const dot = vector.x * normal.x + vector.y * normal.y;
    return {
        x: vector.x - 2 * dot * normal.x,
        y: vector.y - 2 * dot * normal.y
    };
}

export function normalizeVector(vector) {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    return {
        x: length > 0 ? vector.x / length : 0,
        y: length > 0 ? vector.y / length : 0
    };
}

export function rotateVector(vector, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
        x: vector.x * cos - vector.y * sin,
        y: vector.x * sin + vector.y * cos
    };
}

export function getRandomDeflectionAngle(baseAngle, maxDeflection = Math.PI / 6) {
    return baseAngle + (Math.random() * 2 - 1) * maxDeflection;
}

export function clampVector(vector, minLength, maxLength) {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    if (length === 0) return vector;

    const clampedLength = Math.max(minLength, Math.min(length, maxLength));
    const scale = clampedLength / length;

    return {
        x: vector.x * scale,
        y: vector.y * scale
    };
}

export function getIntersectionPoint(line1Start, line1End, line2Start, line2End) {
    const x1 = line1Start.x;
    const y1 = line1Start.y;
    const x2 = line1End.x;
    const y2 = line1End.y;
    const x3 = line2Start.x;
    const y3 = line2Start.y;
    const x4 = line2End.x;
    const y4 = line2End.y;

    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denominator === 0) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return {
            x: x1 + t * (x2 - x1),
            y: y1 + t * (y2 - y1)
        };
    }

    return null;
} 