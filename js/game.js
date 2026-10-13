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

  // Настройки погони, выбора цели и поедания.
  const CHASE_SPEED = 130; // скорость бега к выбранной рыбке, CSS-пиксель/с
  const CATCH_DISTANCE = 30; // дистанция до рыбки, с которой начинается поедание, CSS-пиксель
  const EAT_DURATION = 0.5; // длительность анимации поедания, с
  const TAP_RADIUS = 22; // половина области нажатия на рыбку (не меньше 44 × 44 CSS-пикселей)

  // Настройки появления рыбок.
  const FISH_MAX = 5; // максимум рыбок на поле, включая поедаемую
  const FISH_SPAWN_MIN = 2; // минимальный интервал появления, с
  const FISH_SPAWN_MAX = 4; // максимальный интервал появления, с
  const FISH_RADIUS = 20; // радиус рыбки для границ и размещения, CSS-пиксель
  const FISH_PLACE_ATTEMPTS = 30; // попыток подобрать свободное место
  const HUD_SAFE_TOP = 64; // отступ сверху под интерфейс счётчика, CSS-пиксель

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
        targetFishId: null,
        eatTimer: 0,
      },
      fish: [],
      nextFishId: 1,
      fishTimer: randomBetween(FISH_SPAWN_MIN, FISH_SPAWN_MAX),
      score: 0,
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

  // Отступ от краёв поля с учётом размера рыбки; уменьшается на тесном поле.
  function fishMargin() {
    const half = Math.min(state.width, state.height) / 2;
    return Math.min(FISH_RADIUS, half);
  }

  // Проверяет, что точка свободна: не задевает кота и уже имеющихся рыбок.
  function isFishPositionFree(x, y) {
    const cat = state.cat;
    if (Math.hypot(x - cat.x, y - cat.y) < CAT_RADIUS + FISH_RADIUS) {
      return false;
    }
    for (const fish of state.fish) {
      if (Math.hypot(x - fish.x, y - fish.y) < FISH_RADIUS * 2) {
        return false;
      }
    }
    return true;
  }

  // Пытается разместить рыбку. Не более FISH_PLACE_ATTEMPTS попыток;
  // если места нет — просто пропускает появление без очереди.
  function trySpawnFish() {
    const margin = fishMargin();
    if (state.width - margin * 2 <= 0 || state.height - HUD_SAFE_TOP - margin * 2 <= 0) {
      return;
    }
    for (let attempt = 0; attempt < FISH_PLACE_ATTEMPTS; attempt += 1) {
      const x = randomBetween(margin, state.width - margin);
      const y = randomBetween(HUD_SAFE_TOP + margin, state.height - margin);
      if (isFishPositionFree(x, y)) {
        state.fish.push({
          id: state.nextFishId,
          x,
          y,
          angle: randomBetween(0, Math.PI * 2),
          scale: 1,
        });
        state.nextFishId += 1;
        return;
      }
    }
  }

  // Отсчитывает интервал появления рыбок независимо от состояния котика.
  // При достижении лимита не копит время и не создаёт очередь.
  function updateFishSpawn(deltaTime) {
    if (state.fish.length >= FISH_MAX) {
      return;
    }
    state.fishTimer -= deltaTime;
    if (state.fishTimer > 0) {
      return;
    }
    trySpawnFish();
    state.fishTimer = randomBetween(FISH_SPAWN_MIN, FISH_SPAWN_MAX);
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

  // Ищет рыбку-цель по её ID: позиция берётся из актуального списка, не копия.
  function findTargetFish() {
    if (state.cat.targetFishId === null) {
      return null;
    }
    for (const fish of state.fish) {
      if (fish.id === state.cat.targetFishId) {
        return fish;
      }
    }
    return null;
  }

  // Ищет ближайшую к точке нажатия рыбку в её области (радиус TAP_RADIUS).
  // Если области пересеклись, выбирается ближайшая рыбка к точке нажатия.
  function findFishAt(x, y) {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const fish of state.fish) {
      const distance = Math.hypot(fish.x - x, fish.y - y);
      if (distance <= TAP_RADIUS && distance < nearestDistance) {
        nearest = fish;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  // Возвращает кота к прогулке и сразу выбирает новую точку.
  function startWandering() {
    const cat = state.cat;
    cat.state = "wandering";
    cat.targetFishId = null;
    cat.moving = false;
    cat.pauseTimer = 0;
    chooseWanderTarget();
  }

  // Начинает поедание: кот замирает на месте и разворачивается к рыбке.
  function startEating(fish) {
    const cat = state.cat;
    cat.state = "eating";
    cat.moving = false;
    cat.eatTimer = EAT_DURATION;
    cat.angle = Math.atan2(fish.y - cat.y, fish.x - cat.x);
  }

  // Удаляет рыбку по ID; счёт и состояние меняет вызывающий код.
  function removeFish(id) {
    state.fish = state.fish.filter((fish) => fish.id !== id);
  }

  // Погоня: бег к рыбке с той же логикой поворота, что и при прогулке.
  function updateChasing(deltaTime) {
    const cat = state.cat;
    const fish = findTargetFish();
    if (!fish) {
      startWandering();
      return;
    }

    const dx = fish.x - cat.x;
    const dy = fish.y - cat.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= CATCH_DISTANCE) {
      startEating(fish);
      return;
    }

    const desiredAngle = Math.atan2(dy, dx);
    const maxTurn = TURN_SPEED * deltaTime;
    let diff = desiredAngle - cat.angle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));

    // Как и при прогулке: при большом расхождении сначала поворот на месте.
    if (Math.abs(diff) > TURN_THRESHOLD) {
      cat.moving = false;
      cat.angle = turnToward(cat.angle, desiredAngle, maxTurn);
      return;
    }

    const step = Math.min(CHASE_SPEED * deltaTime, distance);
    cat.moving = true;
    cat.x += (dx / distance) * step;
    cat.y += (dy / distance) * step;
    cat.angle = turnToward(cat.angle, desiredAngle, maxTurn);
  }

  // Поедание: пауза на месте, рыбка уменьшается; затем удаление и +1 к счёту.
  function updateEating(deltaTime) {
    const cat = state.cat;
    const fish = findTargetFish();
    if (!fish) {
      startWandering();
      return;
    }

    cat.moving = false;
    cat.eatTimer = Math.max(0, cat.eatTimer - deltaTime);
    const progress = 1 - cat.eatTimer / EAT_DURATION;
    fish.scale = Math.max(0.15, 1 - progress * 0.85);

    if (cat.eatTimer === 0) {
      removeFish(fish.id);
      state.score += 1;
      startWandering();
    }
  }

  // Реакция на нажатие: выбирает ближайшую рыбку в её области нажатия.
  // Во время еды нажатия игнорируются; пустое место ничего не меняет.
  function selectFish(x, y) {
    if (!state || state.cat.state === "eating") {
      return;
    }
    const fish = findFishAt(x, y);
    if (!fish) {
      return;
    }
    state.cat.state = "chasing";
    state.cat.targetFishId = fish.id;
  }

  // Обновляет игру: появление рыбок, затем поведение кота по его состоянию.
  function update(deltaTime) {
    if (!state) {
      return;
    }
    const cat = state.cat;
    cat.phase += ANIM_SPEED * deltaTime;

    // Появление рыбок идёт независимо от состояния котика.
    updateFishSpawn(deltaTime);

    if (cat.state === "chasing") {
      updateChasing(deltaTime);
      return;
    }
    if (cat.state === "eating") {
      updateEating(deltaTime);
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

  // При изменении окна сохраняет кота, цель прогулки и рыбок в допустимых границах.
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

    // Переносит рыбок в допустимые границы поля, сохраняя их список.
    const fishMarginValue = fishMargin();
    for (const fish of state.fish) {
      fish.x = clamp(fish.x, fishMarginValue, width - fishMarginValue);
      fish.y = clamp(fish.y, HUD_SAFE_TOP + fishMarginValue, height - fishMarginValue);
    }
  }

  game.createState = createState;
  game.update = update;
  game.resize = resize;
  game.selectFish = selectFish;
})();
