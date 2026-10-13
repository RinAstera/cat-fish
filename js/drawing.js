(function () {
  "use strict";

  const CatFish = (window.CatFish = window.CatFish || {});
  const drawing = (CatFish.drawing = {});

  // Размеры котика в CSS-пикселях (вид сверху, нос направлен по оси +X).
  // Длина от кончика хвоста (-44) до носа (+45,5) — около 90.
  const BODY_RADIUS_X = 25;
  const BODY_RADIUS_Y = 17;
  const HEAD_RADIUS = 15.5;
  const HEAD_OFFSET_X = 30;
  const TAIL_BASE_X = -20;
  const TAIL_LENGTH = 24;
  const TAIL_SWAY = 9;
  const TAIL_WIDTHS = [10, 8, 6.2, 4.4];
  const PAW_OFFSET_X = 13;
  const PAW_OFFSET_Y = 16;
  const PAW_RADIUS_X = 7.5;
  const PAW_RADIUS_Y = 6.5;
  const EAR_OFFSET_X = -8;
  const EAR_OFFSET_Y = 11;
  const EAR_WIDTH = 8.5;
  const EAR_HEIGHT = 12;
  const EAR_TILT = 0.55;
  const EYE_OFFSET_X = 6;
  const EYE_OFFSET_Y = 6.2;
  const EYE_RADIUS = 2.7;
  const NOSE_OFFSET_X = 12.5;
  const MUZZLE_OFFSET_X = 7;
  const CHEEK_OFFSET_X = 4;
  const CHEEK_OFFSET_Y = 9;

  // Цвета котика: только программная графика, без внешних ресурсов.
  const COLOR_FUR = "#f2a94d";
  const COLOR_FUR_DARK = "#d9893a";
  const COLOR_FUR_LIGHT = "#f8c67c";
  const COLOR_OUTLINE = "#be7a2e";
  const COLOR_PAW = "#f9e6c4";
  const COLOR_PAW_OUTLINE = "#d9b47f";
  const COLOR_EAR_INNER = "#f4b4ac";
  const COLOR_NOSE = "#ec8b93";
  const COLOR_CHEEK = "rgba(238, 150, 140, 0.35)";
  const COLOR_EYE = "#3a2a1c";
  const COLOR_EYE_SHINE = "#ffffff";
  const COLOR_WHISKER = "rgba(90, 62, 34, 0.5)";
  const COLOR_TAIL_TIP = "#f9e6c4";
  const COLOR_SHADOW = "rgba(58, 38, 18, 0.22)";

  // Скорости анимации — множители к cat.phase (время, растущее по deltaTime).
  const GAIT_IDLE = 0;
  const GAIT_WALK = 1;
  const GAIT_RUN = 2;
  const TAIL_IDLE_SPEED = 1;
  const TAIL_MOVE_SPEED = 1.6;
  const STEP_SPEED_WALK = 2;
  const STEP_SPEED_RUN = 3.3;
  const STEP_AMOUNT_WALK = 3.2;
  const STEP_AMOUNT_RUN = 5.4;
  const BREATH_SPEED = 0.9;
  const EAR_TWITCH_SPEED = 0.7;
  const EAT_SPEED = 3.5;

  // Размеры рыбки в CSS-пикселях (вид сверху, нос направлен по оси +X).
  const FISH_BODY_RADIUS_X = 12;
  const FISH_BODY_RADIUS_Y = 7.5;
  const FISH_TAIL_LENGTH = 9;
  const FISH_TAIL_SPREAD = 7;
  const FISH_FIN_LENGTH = 5;
  const FISH_FIN_SPREAD = 4;

  // Цвета рыбки: серебристо-белое тело с тонким тёмным контуром,
  // чтобы не сливаться с бирюзовой водой и рыжим котиком.
  const COLOR_FISH_BODY = "#eef3f6";
  const COLOR_FISH_BELLY = "#ffffff";
  const COLOR_FISH_FIN = "#cdd9e1";
  const COLOR_FISH_OUTLINE = "#2b3a44";
  const COLOR_FISH_EYE = "#173042";
  const COLOR_FISH_EYE_SHINE = "#ffffff";

  // Фон-мелководье: мягкий градиент бирюзовых и синих оттенков.
  const WATER_COLOR_TOP = "#4fb0aa";
  const WATER_COLOR_MID = "#2f86ab";
  const WATER_COLOR_BOTTOM = "#1d4f7a";

  // Медленные полупрозрачные волнистые штрихи и блики.
  const STROKE_COUNT = 16; // число коротких разрозненных волнистых штрихов
  const STROKE_STEP = 12; // шаг выборки точек штриха, CSS-пиксель (не попиксельно)
  const HIGHLIGHT_COUNT = 3; // число дрейфующих светлых бликов
  const HIGHLIGHT_ALPHA = 0.12;

  // Круги на воде под лапками идущего котика.
  const RIPPLE_LIFE = 0.9; // время жизни круга, с
  const RIPPLE_INTERVAL = 0.22; // интервал появления кругов при прогулке, с
  const RIPPLE_INTERVAL_RUN = 0.14; // интервал появления кругов при беге, с
  const RIPPLE_START_RADIUS = 5; // начальный радиус, CSS-пиксель
  const RIPPLE_MAX_RADIUS = 26; // максимальный радиус, CSS-пиксель
  const RIPPLE_ALPHA = 0.5; // начальная прозрачность круга
  const RIPPLE_FLATTEN = 0.72; // сжатие по вертикали для ощущения поверхности

  // Внутреннее (не игровое) состояние визуальных кругов на воде.
  const ripples = [];
  let rippleTimer = 0;
  let rippleSide = 1;

  // Короткие волнистые штрихи: положение и параметры задаются случайно один раз,
  // в долях поля, чтобы сохраняться при изменении размера окна.
  const strokes = [];
  for (let i = 0; i < STROKE_COUNT; i += 1) {
    strokes.push({
      nx: Math.random(), // позиция в долях поля
      ny: Math.random(),
      length: 40 + Math.random() * 90, // длина штриха, CSS-пиксель
      wavelength: 55 + Math.random() * 75, // длина волны, CSS-пиксель
      amplitude: 3 + Math.random() * 4, // размах, CSS-пиксель
      speed: 0.15 + Math.random() * 0.35, // скорость появления и смещения
      phase: Math.random() * Math.PI * 2, // сдвиг фазы
      alpha: 0.12 + Math.random() * 0.14, // максимальная прозрачность
      drift: 0.4 + Math.random() * 0.8, // множитель горизонтального дрейфа
    });
  }

  // Режим движения для анимации лап: 0 — покой, 1 — прогулка, 2 — бег.
  // Во время паузы прогулки (moving === false) лапки стоят на месте.
  function getGait(cat) {
    if (cat.state === "chasing") {
      return GAIT_RUN;
    }
    if (cat.state === "wandering" && cat.moving) {
      return GAIT_WALK;
    }
    return GAIT_IDLE;
  }

  // Точка квадратичной кривой Безье в параметре t (0..1).
  function bezierPoint(base, ctrl, tip, t) {
    const mt = 1 - t;
    return {
      x: mt * mt * base[0] + 2 * mt * t * ctrl[0] + t * t * tip[0],
      y: mt * mt * base[1] + 2 * mt * t * ctrl[1] + t * t * tip[1],
    };
  }

  // Мягкая полупрозрачная тень под котиком (до поворота по направлению).
  function drawShadow(ctx) {
    ctx.save();
    ctx.translate(0, 4);
    ctx.scale(1, 0.6);
    const gradient = ctx.createRadialGradient(0, 0, 4, 0, 0, 34);
    gradient.addColorStop(0, COLOR_SHADOW);
    gradient.addColorStop(1, "rgba(58, 38, 18, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Один участок хвоста от точки к точке с заданной толщиной.
  function strokeTailPart(ctx, from, to, width) {
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  // Пушистый хвост: толще у основания, с закруглённым кремовым кончиком.
  // В покое плавно качается, при движении следует за ним шире и с запозданием.
  function drawTail(ctx, phase, gait) {
    const moving = gait !== GAIT_IDLE;
    const speed = moving ? TAIL_MOVE_SPEED : TAIL_IDLE_SPEED;
    const amplitude = moving ? TAIL_SWAY : TAIL_SWAY * 0.55;
    const swing = Math.sin(phase * speed - (moving ? 0.6 : 0)) * amplitude;

    const base = [TAIL_BASE_X, 0];
    const ctrl = [TAIL_BASE_X - TAIL_LENGTH * 0.45, swing * 0.35];
    const tip = [TAIL_BASE_X - TAIL_LENGTH, swing];

    const segments = TAIL_WIDTHS.length;
    const points = [{ x: base[0], y: base[1] }];
    for (let i = 1; i <= segments; i += 1) {
      points.push(bezierPoint(base, ctrl, tip, i / segments));
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Тонкий контур на тон темнее основы.
    ctx.strokeStyle = COLOR_OUTLINE;
    for (let i = 0; i < segments; i += 1) {
      strokeTailPart(ctx, points[i], points[i + 1], TAIL_WIDTHS[i] + 2.6);
    }
    // Шерсть: основа рыжая, кончик кремовый.
    for (let i = 0; i < segments; i += 1) {
      ctx.strokeStyle = i === segments - 1 ? COLOR_TAIL_TIP : COLOR_FUR;
      strokeTailPart(ctx, points[i], points[i + 1], TAIL_WIDTHS[i]);
    }
  }

  // Одна кремовая лапка с тонким контуром.
  function drawPaw(ctx, x, y) {
    ctx.beginPath();
    ctx.ellipse(x, y, PAW_RADIUS_X, PAW_RADIUS_Y, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_PAW;
    ctx.fill();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = COLOR_PAW_OUTLINE;
    ctx.stroke();
  }

  // Четыре лапки. При движении шагают по диагонали попарно,
  // при беге шаг шире и быстрее; в покое стоят на месте.
  function drawPaws(ctx, phase, gait) {
    if (gait === GAIT_IDLE) {
      drawPaw(ctx, PAW_OFFSET_X, -PAW_OFFSET_Y);
      drawPaw(ctx, -PAW_OFFSET_X, -PAW_OFFSET_Y);
      drawPaw(ctx, PAW_OFFSET_X, PAW_OFFSET_Y);
      drawPaw(ctx, -PAW_OFFSET_X, PAW_OFFSET_Y);
      return;
    }

    const run = gait === GAIT_RUN;
    const speed = run ? STEP_SPEED_RUN : STEP_SPEED_WALK;
    const amount = run ? STEP_AMOUNT_RUN : STEP_AMOUNT_WALK;
    const step = Math.sin(phase * speed) * amount;

    drawPaw(ctx, PAW_OFFSET_X + step, -PAW_OFFSET_Y);
    drawPaw(ctx, -PAW_OFFSET_X - step, PAW_OFFSET_Y);
    drawPaw(ctx, PAW_OFFSET_X - step, PAW_OFFSET_Y);
    drawPaw(ctx, -PAW_OFFSET_X + step, -PAW_OFFSET_Y);
  }

  // Пухлое тело-овал с лёгким «дыханием» и тремя полосками на спине.
  // В покое дыхание заметнее, в движении остаётся едва уловимым.
  function drawBody(ctx, phase, gait) {
    const breathAmount = gait === GAIT_IDLE ? 0.02 : 0.008;
    const breath = 1 + Math.sin(phase * BREATH_SPEED) * breathAmount;

    ctx.save();
    ctx.scale(breath, breath);

    ctx.beginPath();
    ctx.ellipse(0, 0, BODY_RADIUS_X, BODY_RADIUS_Y, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_FUR;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = COLOR_OUTLINE;
    ctx.stroke();

    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = COLOR_FUR_DARK;
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    for (const stripeX of [-9, 0, 9]) {
      ctx.beginPath();
      ctx.moveTo(stripeX, -BODY_RADIUS_Y * 0.72);
      ctx.quadraticCurveTo(stripeX + 3, 0, stripeX, BODY_RADIUS_Y * 0.72);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // Редкое короткое дёрганье уха: узкий всплеск периодической функции.
  function earTwitch(phase, side) {
    const frequency = side < 0 ? EAR_TWITCH_SPEED : EAR_TWITCH_SPEED * 0.73;
    const pulse = Math.sin(phase * frequency + (side < 0 ? 0 : 1.7));
    return Math.pow(Math.max(0, pulse), 14) * 0.24;
  }

  // Скруглённое ухо с розовой серединкой; side: -1 верхнее, +1 нижнее.
  function drawEar(ctx, side, twitch) {
    ctx.save();
    ctx.translate(EAR_OFFSET_X, side * EAR_OFFSET_Y);
    if (side > 0) {
      ctx.rotate(EAR_TILT + twitch);
      ctx.scale(1, -1);
    } else {
      ctx.rotate(-EAR_TILT - twitch);
    }

    ctx.beginPath();
    ctx.moveTo(-EAR_WIDTH / 2, 1);
    ctx.quadraticCurveTo(-EAR_WIDTH / 2 - 1, -EAR_HEIGHT * 0.55, 0, -EAR_HEIGHT);
    ctx.quadraticCurveTo(EAR_WIDTH / 2 + 1, -EAR_HEIGHT * 0.55, EAR_WIDTH / 2, 1);
    ctx.quadraticCurveTo(0, 3, -EAR_WIDTH / 2, 1);
    ctx.closePath();
    ctx.fillStyle = COLOR_FUR;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = COLOR_OUTLINE;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, -EAR_HEIGHT * 0.5, EAR_WIDTH * 0.24, EAR_HEIGHT * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_EAR_INNER;
    ctx.fill();

    ctx.restore();
  }

  function drawEars(ctx, phase) {
    for (const side of [-1, 1]) {
      drawEar(ctx, side, earTwitch(phase, side));
    }
  }

  function drawEyes(ctx) {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(EYE_OFFSET_X, side * EYE_OFFSET_Y, EYE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = COLOR_EYE;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(EYE_OFFSET_X - 0.9, side * EYE_OFFSET_Y - 0.9, 1, 0, Math.PI * 2);
      ctx.fillStyle = COLOR_EYE_SHINE;
      ctx.fill();
    }
  }

  function drawNose(ctx) {
    ctx.beginPath();
    ctx.moveTo(NOSE_OFFSET_X + 2.1, 0);
    ctx.quadraticCurveTo(NOSE_OFFSET_X - 1, -2.9, NOSE_OFFSET_X - 2.1, 0);
    ctx.quadraticCurveTo(NOSE_OFFSET_X - 1, 2.9, NOSE_OFFSET_X + 2.1, 0);
    ctx.closePath();
    ctx.fillStyle = COLOR_NOSE;
    ctx.fill();
  }

  // Тонкие усы, расходящиеся от мордочки вперёд-в стороны.
  function drawWhiskers(ctx) {
    ctx.strokeStyle = COLOR_WHISKER;
    ctx.lineWidth = 0.9;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(9, side * 3.6);
      ctx.quadraticCurveTo(14, side * 5.2, 19, side * 6.4);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(9, side * 5);
      ctx.quadraticCurveTo(14, side * 8.2, 18, side * 10.5);
      ctx.stroke();
    }
  }

  // Крупная круглая голова со щёчками, ушами, глазами, носом и усами.
  // При поедании голова наклоняется вперёд-назад; в покое — плавно ведёт.
  function drawHead(ctx, phase, eating) {
    const bob = eating ? Math.sin(phase * EAT_SPEED) * 2.6 : 0;
    const tilt = eating ? Math.sin(phase * EAT_SPEED) * 0.14 : Math.sin(phase * 0.8) * 0.03;

    ctx.save();
    ctx.translate(HEAD_OFFSET_X + bob, 0);
    ctx.rotate(tilt);

    drawEars(ctx, phase);

    ctx.beginPath();
    ctx.arc(0, 0, HEAD_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_FUR;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = COLOR_OUTLINE;
    ctx.stroke();

    // Светлая мордочка и румяные щёчки.
    ctx.beginPath();
    ctx.ellipse(MUZZLE_OFFSET_X, 0, 7.5, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_FUR_LIGHT;
    ctx.fill();

    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(CHEEK_OFFSET_X, side * CHEEK_OFFSET_Y, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = COLOR_CHEEK;
      ctx.fill();
    }

    drawEyes(ctx);
    drawNose(ctx);
    drawWhiskers(ctx);

    ctx.restore();
  }

  // Рисует котика сверху. cat: { x, y, angle, phase, state }.
  // phase — время анимации (растёт по deltaTime), state — wandering/chasing/eating.
  function drawCat(ctx, cat) {
    const phase = cat.phase;
    const gait = getGait(cat);
    const eating = cat.state === "eating";
    const run = gait === GAIT_RUN;
    const stepSpeed = run ? STEP_SPEED_RUN : STEP_SPEED_WALK;
    const gaitAmount = gait === GAIT_IDLE ? 0 : run ? 1.35 : 1;
    const rock = Math.sin(phase * stepSpeed) * 0.05 * gaitAmount;

    ctx.save();
    ctx.translate(cat.x, cat.y);
    drawShadow(ctx);
    ctx.rotate(cat.angle);
    ctx.rotate(rock);

    drawTail(ctx, phase, gait);
    drawPaws(ctx, phase, gait);
    drawBody(ctx, phase, gait);
    drawHead(ctx, phase, eating);

    ctx.restore();
  }

  // Рисует рыбку сверху. fish: { x, y, angle, scale }. Состояние не изменяет.
  // scale уменьшается во время поедания (1 — обычный размер).
  function drawFish(ctx, fish) {
    const scale = fish.scale === undefined ? 1 : fish.scale;
    ctx.save();
    ctx.translate(fish.x, fish.y);
    ctx.rotate(fish.angle);
    ctx.scale(scale, scale);

    // Мягкая тень под рыбкой.
    ctx.save();
    ctx.translate(1, 3);
    ctx.scale(1, 0.55);
    ctx.beginPath();
    ctx.arc(0, 0, FISH_BODY_RADIUS_X, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_SHADOW;
    ctx.fill();
    ctx.restore();

    // Хвостовой плавник-«вилка» позади тела.
    ctx.beginPath();
    ctx.moveTo(-FISH_BODY_RADIUS_X + 2, 0);
    ctx.lineTo(-FISH_BODY_RADIUS_X - FISH_TAIL_LENGTH, -FISH_TAIL_SPREAD);
    ctx.lineTo(-FISH_BODY_RADIUS_X - FISH_TAIL_LENGTH * 0.5, 0);
    ctx.lineTo(-FISH_BODY_RADIUS_X - FISH_TAIL_LENGTH, FISH_TAIL_SPREAD);
    ctx.closePath();
    ctx.fillStyle = COLOR_FISH_FIN;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = COLOR_FISH_OUTLINE;
    ctx.stroke();

    // Боковые плавники по бокам тела.
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, side * FISH_BODY_RADIUS_Y * 0.55);
      ctx.lineTo(-FISH_FIN_LENGTH, side * (FISH_BODY_RADIUS_Y + FISH_FIN_SPREAD));
      ctx.lineTo(3, side * FISH_BODY_RADIUS_Y * 0.6);
      ctx.closePath();
      ctx.fillStyle = COLOR_FISH_FIN;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = COLOR_FISH_OUTLINE;
      ctx.stroke();
    }

    // Тело-овал со светлым брюшком.
    ctx.beginPath();
    ctx.ellipse(0, 0, FISH_BODY_RADIUS_X, FISH_BODY_RADIUS_Y, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_FISH_BODY;
    ctx.fill();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = COLOR_FISH_OUTLINE;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(2, 0, FISH_BODY_RADIUS_X * 0.62, FISH_BODY_RADIUS_Y * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_FISH_BELLY;
    ctx.fill();

    // Пара глаз у головы.
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(FISH_BODY_RADIUS_X * 0.5, side * FISH_BODY_RADIUS_Y * 0.42, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = COLOR_FISH_EYE;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(
        FISH_BODY_RADIUS_X * 0.5 - 0.8,
        side * FISH_BODY_RADIUS_Y * 0.42 - 0.8,
        0.9,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = COLOR_FISH_EYE_SHINE;
      ctx.fill();
    }

    ctx.restore();
  }

  // Медленные светлые блики, плавно дрейфующие по воде.
  function drawHighlights(ctx, width, height, time) {
    const base = Math.min(width, height);
    for (let i = 0; i < HIGHLIGHT_COUNT; i += 1) {
      const seed = i * 1.7;
      const cx = width * (0.22 + 0.28 * i) + Math.sin(time * 0.06 + seed) * width * 0.06;
      const cy = height * (0.28 + 0.2 * i) + Math.cos(time * 0.05 + seed) * height * 0.05;
      const radius = base * (0.18 + 0.04 * i);
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      glow.addColorStop(0, "rgba(214, 255, 250, " + HIGHLIGHT_ALPHA + ")");
      glow.addColorStop(1, "rgba(214, 255, 250, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Короткие разрозненные волнистые штрихи: у каждого свои длина, положение,
  // скорость, прозрачность и фаза; плавно появляются и исчезают по времени.
  function drawWaves(ctx, width, height, time) {
    ctx.lineCap = "round";
    ctx.lineWidth = 2;
    for (const stroke of strokes) {
      const cycle = time * stroke.speed + stroke.phase;
      const visibility = Math.max(0, Math.sin(cycle));
      if (visibility <= 0.01) {
        continue;
      }
      const alpha = stroke.alpha * visibility;
      const driftX = Math.sin(time * stroke.speed * 0.6 + stroke.phase) * width * 0.04 * stroke.drift;
      const startX = stroke.nx * width + driftX - stroke.length / 2;
      const baseY = stroke.ny * height;

      ctx.strokeStyle = "rgba(235, 255, 252, " + alpha.toFixed(3) + ")";
      ctx.beginPath();
      for (let x = 0; x <= stroke.length; x += STROKE_STEP) {
        const px = startX + x;
        const py = baseY + Math.sin((x / stroke.wavelength) * Math.PI * 2 + cycle * 1.5) * stroke.amplitude;
        if (x === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    }
  }

  // Фон-мелководье: градиент воды, блики и волны. Рисуется первым, под объектами.
  function drawBackground(ctx, width, height, time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, WATER_COLOR_TOP);
    gradient.addColorStop(0.55, WATER_COLOR_MID);
    gradient.addColorStop(1, WATER_COLOR_BOTTOM);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    drawHighlights(ctx, width, height, time);
    drawWaves(ctx, width, height, time);
  }

  // Создаёт круг на воде под очередной лапкой идущего котика.
  function spawnRipple(cat) {
    const side = rippleSide;
    rippleSide = -rippleSide;
    const localX = -10; // ближе к задним лапкам
    const localY = side * PAW_OFFSET_Y;
    const cos = Math.cos(cat.angle);
    const sin = Math.sin(cat.angle);
    ripples.push({
      x: cat.x + localX * cos - localY * sin,
      y: cat.y + localX * sin + localY * cos,
      age: 0,
    });
  }

  // Обновляет круги на воде: появление при движении и плавное угасание.
  // Визуальное состояние, игровую логику не затрагивает.
  function updateRipples(cat, deltaTime) {
    if (cat.moving) {
      rippleTimer -= deltaTime;
      if (rippleTimer <= 0) {
        spawnRipple(cat);
        rippleTimer = cat.state === "chasing" ? RIPPLE_INTERVAL_RUN : RIPPLE_INTERVAL;
      }
    } else {
      rippleTimer = 0;
    }

    for (let i = ripples.length - 1; i >= 0; i -= 1) {
      ripples[i].age += deltaTime;
      if (ripples[i].age >= RIPPLE_LIFE) {
        ripples.splice(i, 1);
      }
    }
  }

  // Рисует круги на воде: радиус растёт, прозрачность убывает с возрастом.
  function drawRipples(ctx) {
    ctx.lineWidth = 2;
    for (const ripple of ripples) {
      const progress = ripple.age / RIPPLE_LIFE;
      const radius = RIPPLE_START_RADIUS + progress * RIPPLE_MAX_RADIUS;
      const alpha = (1 - progress) * RIPPLE_ALPHA;

      ctx.strokeStyle = "rgba(240, 255, 252, " + alpha.toFixed(3) + ")";
      ctx.beginPath();
      ctx.ellipse(ripple.x, ripple.y, radius, radius * RIPPLE_FLATTEN, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(240, 255, 252, " + (alpha * 0.6).toFixed(3) + ")";
      ctx.beginPath();
      ctx.ellipse(
        ripple.x,
        ripple.y,
        radius * 0.6,
        radius * 0.6 * RIPPLE_FLATTEN,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
  }

  drawing.drawCat = drawCat;
  drawing.drawFish = drawFish;
  drawing.drawBackground = drawBackground;
  drawing.drawRipples = drawRipples;
  drawing.updateRipples = updateRipples;
})();
