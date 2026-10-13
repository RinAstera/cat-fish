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

  drawing.drawCat = drawCat;
})();
