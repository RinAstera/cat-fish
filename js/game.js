(function () {
  "use strict";

  const CatFish = (window.CatFish = window.CatFish || {});
  const game = (CatFish.game = {});

  // Настройки прогулки.
  const WALK_SPEED = 35; // скорость неспешной прогулки, CSS-пиксель/с
  const TURN_SPEED = 7; // скорость поворота к направлению движения, радиан/с
  const TURN_THRESHOLD = Math.PI / 4; // порог 45°: сначала поворот на месте, затем ходьба
  const PAUSE_MIN = 0.5; // минимальная пауза между точками, с
  const PAUSE_MAX = 1.5; // максимальная пауза между точками, с
  // Радиус описанной окружности котика для границ поля и размещения рыбок.
  // Учитывает весь рисунок при любом повороте: усы с вытянутой вперёд головой
  // во время поедания доходят до ~51,3 px от центра, поэтому с запасом — 52.
  const CAT_RADIUS = 52; // CSS-пиксель
  const ANIM_SPEED = 2.2; // рост фазы анимации (хвост, лапки), радиан/с

  let state = null;

  // Создаёт состояние игры; котик размещается в центре и получает первую цель.
  function createState(width, height) {
    state = {
      width,
      height,
      cat: {
        x: width / 2,
        y: height / 2,
        angle: 0,
        phase: 0,
        state: "wandering",
        moving: false,
        pauseTimer: 0,
        targetX: width / 2,
        targetY: height / 2,
      },
    };
    chooseWanderTarget();
    return state;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  // Случайное число в диапазоне; при вырожденном диапазоне вернёт нижнюю границу.
  function randomBetween(min, max) {
    if (max <= min) {
      return min;
    }
    return min + Math.random() * (max - min);
  }

  // Отступ от краёв поля с учётом размера кота; уменьшается на тесном поле.
  function catMargin() {
    const half = Math.min(state.width, state.height) / 2;
    return Math.min(CAT_RADIUS, half);
  }

  // Выбирает новую точку прогулки внутри допустимых границ поля.
  function chooseWanderTarget() {
    const margin = catMargin();
    state.cat.targetX = randomBetween(margin, state.width - margin);
    state.cat.targetY = randomBetween(margin, state.height - margin);
  }

  // Плавный поворот к целевому углу с ограничением шага за кадр.
  function turnToward(current, target, maxStep) {
    let diff = target - current;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    if (Math.abs(diff) <= maxStep) {
      return target;
    }
    return current + Math.sign(diff) * maxStep;
  }

  // Движение к цели прогулки; по прибытии начинается короткая пауза.
  function moveTowardTarget(deltaTime) {
    const cat = state.cat;
    const dx = cat.targetX - cat.x;
    const dy = cat.targetY - cat.y;
    const distance = Math.hypot(dx, dy);
    const step = WALK_SPEED * deltaTime;

    if (distance <= step || distance === 0) {
      cat.x = cat.targetX;
      cat.y = cat.targetY;
      cat.moving = false;
      cat.pauseTimer = randomBetween(PAUSE_MIN, PAUSE_MAX);
      return;
    }

    const desiredAngle = Math.atan2(dy, dx);
    const maxTurn = TURN_SPEED * deltaTime;
    let diff = desiredAngle - cat.angle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));

    // Если до цели больше 45°, сначала разворачиваемся на месте, без хода боком.
    if (Math.abs(diff) > TURN_THRESHOLD) {
      cat.moving = false;
      cat.angle = turnToward(cat.angle, desiredAngle, maxTurn);
      return;
    }

    cat.moving = true;
    cat.x += (dx / distance) * step;
    cat.y += (dy / distance) * step;
    cat.angle = turnToward(cat.angle, desiredAngle, maxTurn);
  }

  // Обновляет прогулку: движение к точке, пауза, затем новая точка.
  function update(deltaTime) {
    if (!state) {
      return;
    }
    const cat = state.cat;
    cat.phase += ANIM_SPEED * deltaTime;

    if (cat.state !== "wandering") {
      cat.moving = false;
      return;
    }

    if (cat.pauseTimer > 0) {
      cat.moving = false;
      cat.pauseTimer = Math.max(0, cat.pauseTimer - deltaTime);
      if (cat.pauseTimer === 0) {
        chooseWanderTarget();
      }
      return;
    }

    moveTowardTarget(deltaTime);
  }

  // При изменении окна сохраняет кота и цель прогулки в допустимых границах.
  function resize(width, height) {
    if (!state) {
      createState(width, height);
      return;
    }
    state.width = width;
    state.height = height;
    const margin = catMargin();
    state.cat.x = clamp(state.cat.x, margin, width - margin);
    state.cat.y = clamp(state.cat.y, margin, height - margin);
    state.cat.targetX = clamp(state.cat.targetX, margin, width - margin);
    state.cat.targetY = clamp(state.cat.targetY, margin, height - margin);
  }

  game.createState = createState;
  game.update = update;
  game.resize = resize;
})();
