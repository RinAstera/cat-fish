(function () {
  "use strict";

  const CatFish = (window.CatFish = window.CatFish || {});
  const MAX_DELTA = 0.05;

  let canvas = null;
  let ctx = null;
  let viewWidth = 0;
  let viewHeight = 0;
  let lastTime = 0;

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
  }

  function render() {
    ctx.clearRect(0, 0, viewWidth, viewHeight);
    // Рисование котика и рыбок добавится в следующих задачах.
  }

  function frame(timestamp) {
    const deltaTime = Math.min((timestamp - lastTime) / 1000, MAX_DELTA);
    lastTime = timestamp;

    update(deltaTime);
    render();

    window.requestAnimationFrame(frame);
  }

  function init() {
    canvas = document.getElementById("game-canvas");
    ctx = canvas.getContext("2d");

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    lastTime = performance.now();
    window.requestAnimationFrame(frame);
  }

  init();
})();
