(function () {
  "use strict";

  const CatFish = (window.CatFish = window.CatFish || {});
  const MAX_DELTA = 0.05;

  let canvas = null;
  let ctx = null;
  let viewWidth = 0;
  let viewHeight = 0;
  let lastTime = 0;
  let state = null;
  let scoreEl = null;
  let lastScore = -1;
  let elapsed = 0; // накопленное время анимации фона, с (по deltaTime)

  // Настроить размер canvas под окно с учётом devicePixelRatio.
  function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    viewWidth = window.innerWidth;
    viewHeight = window.innerHeight;

    canvas.width = Math.round(viewWidth * ratio);
    canvas.height = Math.round(viewHeight * ratio);
    canvas.style.width = viewWidth + "px";
    canvas.style.height = viewHeight + "px";

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    if (typeof CatFish.game.resize === "function") {
      CatFish.game.resize(viewWidth, viewHeight);
    }
  }

  function update(deltaTime) {
    if (typeof CatFish.game.update === "function") {
      CatFish.game.update(deltaTime);
    }
    if (state && typeof CatFish.drawing.updateRipples === "function") {
      CatFish.drawing.updateRipples(state.cat, deltaTime);
    }
  }

  function render() {
    ctx.clearRect(0, 0, viewWidth, viewHeight);
    if (typeof CatFish.drawing.drawBackground === "function") {
      CatFish.drawing.drawBackground(ctx, viewWidth, viewHeight, elapsed);
    }
    if (typeof CatFish.drawing.drawRipples === "function") {
      CatFish.drawing.drawRipples(ctx);
    }
    if (state && Array.isArray(state.fish) && typeof CatFish.drawing.drawFish === "function") {
      for (const fish of state.fish) {
        CatFish.drawing.drawFish(ctx, fish);
      }
    }
    if (state && typeof CatFish.drawing.drawCat === "function") {
      CatFish.drawing.drawCat(ctx, state.cat);
    }
  }

  // Обновляет надпись счётчика, только когда счёт изменился.
  function syncScore() {
    if (!scoreEl || !state || state.score === lastScore) {
      return;
    }
    lastScore = state.score;
    scoreEl.textContent = "Съедено: " + state.score;
  }

  // Единая обработка нажатия мышью и касанием: выбор рыбки по координатам.
  function pointerDown(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (typeof CatFish.game.selectFish === "function") {
      CatFish.game.selectFish(x, y);
    }
  }

  function frame(timestamp) {
    const deltaTime = Math.min((timestamp - lastTime) / 1000, MAX_DELTA);
    lastTime = timestamp;
    elapsed += deltaTime;

    update(deltaTime);
    render();
    syncScore();

    window.requestAnimationFrame(frame);
  }

  function init() {
    canvas = document.getElementById("game-canvas");
    ctx = canvas.getContext("2d");
    scoreEl = document.getElementById("score");

    viewWidth = window.innerWidth;
    viewHeight = window.innerHeight;
    state = CatFish.game.createState(viewWidth, viewHeight);

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("pointerdown", pointerDown);

    lastTime = performance.now();
    window.requestAnimationFrame(frame);
  }

  init();
})();
