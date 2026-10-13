(function () {
  "use strict";

  const CatFish = (window.CatFish = window.CatFish || {});
  const game = (CatFish.game = {});

  // Скорость покачивания хвоста, радиан в секунду.
  const TAIL_SPEED = 2.2;

  let state = null;

  // Создаёт состояние игры; котик размещается в центре поля.
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
      },
    };
    return state;
  }

  // Обновляет только фазу анимации; движение появится в следующих задачах.
  function update(deltaTime) {
    if (!state) {
      return;
    }
    state.cat.phase += TAIL_SPEED * deltaTime;
  }

  // При изменении окна котик пока остаётся в центре поля.
  function resize(width, height) {
    if (!state) {
      createState(width, height);
      return;
    }
    state.width = width;
    state.height = height;
    state.cat.x = width / 2;
    state.cat.y = height / 2;
  }

  game.createState = createState;
  game.update = update;
  game.resize = resize;
})();
