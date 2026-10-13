(function () {
  "use strict";

  const CatFish = (window.CatFish = window.CatFish || {});
  const drawing = (CatFish.drawing = {});

  // Размеры котика в CSS-пикселях (вид сверху, нос направлен по оси +X).
  const BODY_RADIUS_X = 24;
  const BODY_RADIUS_Y = 15;
  const HEAD_RADIUS = 13;
  const HEAD_OFFSET_X = 31;
  const TAIL_SWAY = 7;
  const PAW_OFFSET_X = 11;
  const PAW_RADIUS_X = 7;
  const PAW_RADIUS_Y = 5;
  const EYE_OFFSET_X = 36;
  const EYE_OFFSET_Y = 5;
  const EYE_RADIUS = 2.4;

  // Цвета котика: только программная графика, без внешних ресурсов.
  const COLOR_FUR = "#e8a24a";
  const COLOR_FUR_DARK = "#cf8330";
  const COLOR_PAW = "#f2bd72";
  const COLOR_EAR_INNER = "#f6cdad";
  const COLOR_EYE = "#2c2116";

  // Рисует хвост позади тела с лёгким покачиванием в покое.
  function drawTail(ctx, phase) {
    const sway = Math.sin(phase) * TAIL_SWAY;
    ctx.beginPath();
    ctx.moveTo(-BODY_RADIUS_X + 4, 0);
    ctx.quadraticCurveTo(-BODY_RADIUS_X - 16, sway * 0.4, -BODY_RADIUS_X - 30, sway);
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.strokeStyle = COLOR_FUR_DARK;
    ctx.stroke();
  }

  // Рисует четыре лапки по бокам тела.
  function drawPaws(ctx) {
    const positions = [
      [PAW_OFFSET_X, -BODY_RADIUS_Y],
      [PAW_OFFSET_X, BODY_RADIUS_Y],
      [-PAW_OFFSET_X, -BODY_RADIUS_Y],
      [-PAW_OFFSET_X, BODY_RADIUS_Y],
    ];
    ctx.fillStyle = COLOR_PAW;
    for (const [px, py] of positions) {
      ctx.beginPath();
      ctx.ellipse(px, py, PAW_RADIUS_X, PAW_RADIUS_Y, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBody(ctx) {
    ctx.beginPath();
    ctx.ellipse(0, 0, BODY_RADIUS_X, BODY_RADIUS_Y, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_FUR;
    ctx.fill();
  }

  function drawHead(ctx) {
    ctx.beginPath();
    ctx.arc(HEAD_OFFSET_X, 0, HEAD_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_FUR;
    ctx.fill();
  }

  // Рисует один треугольный глаз-ушко по трём точкам.
  function drawEar(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    ctx.lineTo(points[1][0], points[1][1]);
    ctx.lineTo(points[2][0], points[2][1]);
    ctx.closePath();
    ctx.fillStyle = COLOR_FUR;
    ctx.fill();
  }

  // Уши сверху — два треугольника по бокам головы.
  function drawEars(ctx) {
    drawEar(ctx, [
      [24, -10],
      [40, -8],
      [33, -24],
    ]);
    drawEar(ctx, [
      [24, 10],
      [40, 8],
      [33, 24],
    ]);
  }

  function drawEyes(ctx) {
    ctx.fillStyle = COLOR_EYE;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(EYE_OFFSET_X, dir * EYE_OFFSET_Y, EYE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Рисует котика сверху. cat: { x, y, angle, phase }.
  function drawCat(ctx, cat) {
    ctx.save();
    ctx.translate(cat.x, cat.y);
    ctx.rotate(cat.angle);

    drawTail(ctx, cat.phase);
    drawPaws(ctx);
    drawBody(ctx);
    drawHead(ctx);
    drawEars(ctx);
    drawEyes(ctx);

    ctx.restore();
  }

  drawing.drawCat = drawCat;
})();
