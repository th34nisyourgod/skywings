// main.js — wires everything together and runs the loop.
(function(){
  Storage.load();
  document.body.classList.toggle('dark-mode', Storage.data.settings.dark);
  Particles.init();

  const canvas = document.getElementById('game-canvas');
  const fxCanvas = document.getElementById('fx-canvas');
  const game = new Game(canvas, fxCanvas);
  window.__game = game; // handy for debugging

  UI.init(game);

  // ----- wire game events to UI -----
  game.onScoreChange = (score) => UI.updateHUD(score, Storage.data.coins + game.runCoins);
  game.onCoinChange = (coins) => UI.updateHUD(game.score, coins);
  game.onPowerupChange = (active) => UI.updatePowerups(active);
  game.onGameOver = (payload) => {
    UI.showGameOver(payload);
  };

  // AchievementSys.checkAll() is invoked from game.gameOver() and from the shop;
  // this single callback is the only place toasts are shown, so each unlock fires once.
  let toastQueue = Promise.resolve();
  AchievementSys.onUnlock = (a) => {
    toastQueue = toastQueue.then(() => new Promise(resolve => {
      UI.showAchievementToast(a);
      setTimeout(resolve, 1600);
    }));
  };

  // ----- input -----
  function tryFlap(e){
    if (e) e.preventDefault();
    AudioSys.init(); AudioSys.resume();
    if (game.state === STATE.PLAYING){
      UI.showTapHint(false);
      game.flap();
    }
  }

  canvas.addEventListener('pointerdown', tryFlap, {passive:false});
  fxCanvas.addEventListener('pointerdown', tryFlap, {passive:false});
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp'){
      if (game.state === STATE.PLAYING) tryFlap(e);
      else if (game.state === STATE.MENU) { e.preventDefault(); UI.handleAction('play'); }
    }
    if (e.code === 'Escape'){
      if (game.state === STATE.PLAYING){ game.pause(); UI.showScreen('screen-pause'); }
      else if (game.state === STATE.PAUSED) UI.handleAction('resume');
    }
    if (e.code === 'KeyP' && game.state === STATE.PLAYING){
      game.pause(); UI.showScreen('screen-pause');
    }
  });

  document.getElementById('pause-btn').addEventListener('click', () => {
    AudioSys.click();
    game.pause();
    UI.showScreen('screen-pause');
  });

  // prevent context menu / pinch zoom weirdness
  window.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('gesturestart', e => e.preventDefault());

  // ----- loading sequence -----
  const loadingFill = document.getElementById('loading-fill');
  const tips = [
    'Tap or press Space to flap',
    'Perfect passes through gap centers give bonus points',
    'Coins unlock new bird skins in the Shop',
    'Shields absorb one hit — look for the 🛡️ powerup',
    'The sky shifts from day to night as your score climbs',
  ];
  document.getElementById('loading-tip').textContent = Utils.choice(tips);

  let progress = 0;
  const loadTimer = setInterval(() => {
    progress += Utils.rand(8, 22);
    if (progress >= 100){
      progress = 100;
      clearInterval(loadTimer);
      setTimeout(() => {
        UI.showScreen('screen-menu');
        game.setState(STATE.MENU);
        UI.renderMenuStats();
      }, 200);
    }
    loadingFill.style.width = progress + '%';
  }, 120);

  // ----- main loop -----
  let last = performance.now();
  let fpsAccum = 0, fpsCount = 0, fpsLast = performance.now();

  function loop(now){
    requestAnimationFrame(loop);
    let dt = (now - last) / 1000;
    last = now;
    dt = Math.min(dt, 1/30); // clamp for tab-switch spikes

    game.update(dt);
    game.render();

    fpsCount++;
    if (now - fpsLast > 500){
      const fps = fpsCount / ((now - fpsLast)/1000);
      UI.updateFPS(fps);
      fpsCount = 0;
      fpsLast = now;
    }
  }
  requestAnimationFrame(loop);
})();
