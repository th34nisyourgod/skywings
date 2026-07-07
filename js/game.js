// game.js — the Game class: owns the loop, world state, and canvas rendering.

const STATE = {
  LOADING:'loading', MENU:'menu', PLAYING:'playing', PAUSED:'paused',
  GAMEOVER:'gameover', SETTINGS:'settings', LEADERBOARD:'leaderboard',
  SHOP:'shop', HOWTO:'howto',
};

class Game{
  constructor(canvas, fxCanvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.fxCanvas = fxCanvas;
    this.fxCtx = fxCanvas.getContext('2d');

    this.state = STATE.LOADING;
    this.width = 0; this.height = 0; this.dpr = 1;

    this.bird = null;
    this.pipes = [];
    this.coins = [];
    this.powerups = [];

    this.score = 0;
    this.combo = 0;
    this.runCoins = 0;
    this.distance = 0;
    this.spawnTimer = 0;
    this.groundOffset = 0;
    this.cloudOffset = 0;
    this.mountainOffset = 0;
    this.treeOffset = 0;

    this.activePowerups = {}; // type -> remainingTime
    this.shakeTime = 0;
    this.shakeMag = 0;
    this.zoom = 1;
    this.flashAlpha = 0;

    this.floatingTexts = [];

    this.lastTime = 0;
    this.fps = 60;
    this.fpsFrames = [];

    this.onScoreChange = null;
    this.onCoinChange = null;
    this.onStateChange = null;
    this.onGameOver = null;
    this.onPowerupChange = null;

    this._resize();
    window.addEventListener('resize', () => this._resize());
    window.addEventListener('orientationchange', () => setTimeout(()=>this._resize(), 200));
  }

  _resize(){
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    for (const c of [this.canvas, this.fxCanvas]){
      c.width = this.width * this.dpr;
      c.height = this.height * this.dpr;
    }
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    this.fxCtx.setTransform(this.dpr,0,0,this.dpr,0,0);
    this.groundY = this.height * (1 - CONFIG.GROUND_HEIGHT_RATIO);
  }

  setState(s){
    this.state = s;
    if (this.onStateChange) this.onStateChange(s);
  }

  // ---------------- RUN LIFECYCLE ----------------

  startRun(){
    const skin = Storage.data.selectedBird;
    this.bird = new Bird(this.width * CONFIG.BIRD_X_RATIO, this.height/2, skin);
    this.pipes = [];
    this.coins = [];
    this.powerups = [];
    this.floatingTexts = [];
    this.activePowerups = {};
    this.score = 0;
    this.combo = 0;
    this.runCoins = 0;
    this.distance = 0;
    this.spawnTimer = 0.6;
    this.runStartTime = performance.now();
    this.zoom = 1;
    this.shakeTime = 0;
    Particles.clear();
    this.setState(STATE.PLAYING);
    this._emitScore();
    this._emitCoins();
    AudioSys.startMusic();
  }

  flap(){
    if (this.state !== STATE.PLAYING) return;
    this.bird.flap();
    AudioSys.jump();
    Particles.feather(this.bird.x - 10, this.bird.y + 6);
  }

  pause(){
    if (this.state !== STATE.PLAYING) return;
    this.setState(STATE.PAUSED);
    AudioSys.stopMusic();
  }

  resume(){
    if (this.state !== STATE.PAUSED) return;
    this.setState(STATE.PLAYING);
    AudioSys.startMusic();
  }

  gameOver(){
    if (this.state !== STATE.PLAYING) return;
    this.setState(STATE.GAMEOVER);
    AudioSys.stopMusic();
    AudioSys.death();
    this.shakeTime = 0.3; this.shakeMag = 10;
    Particles.deathExplosion(this.bird.x, this.bird.y, this.bird.colors);

    const playTime = (performance.now() - this.runStartTime) / 1000;
    const st = Storage.data.stats;
    st.gamesPlayed++;
    st.coinsCollected += this.runCoins;
    st.distance += Math.floor(this.distance);
    st.playTimeSec += playTime;
    st.deaths++;
    st.bestCombo = Math.max(st.bestCombo, this.combo);
    st.totalScore += this.score;

    Storage.data.coins += this.runCoins;
    const isNewBest = this.score > Storage.data.highScore;
    if (isNewBest) Storage.data.highScore = this.score;
    Storage.addScoreEntry(this.score, this.runCoins);
    Storage.save();

    const newAchievements = AchievementSys.checkAll();

    if (this.onGameOver) this.onGameOver({ score:this.score, coins:this.runCoins, isNewBest, newAchievements });
  }

  // ---------------- DIFFICULTY ----------------

  _difficultyT(){
    return Utils.clamp(this.score / CONFIG.MAX_DIFFICULTY_SCORE, 0, 1);
  }

  currentPipeSpeed(){
    const t = this._difficultyT();
    let speed = Utils.lerp(CONFIG.PIPE_SPEED_START, CONFIG.PIPE_SPEED_MAX, t);
    if (this.activePowerups.slowmo) speed *= 0.55;
    return speed;
  }

  currentGap(){
    const t = this._difficultyT();
    return Utils.lerp(CONFIG.PIPE_GAP_START, CONFIG.PIPE_GAP_MIN, t);
  }

  // ---------------- SPAWNING ----------------

  _spawnPipe(){
    const gap = this.currentGap();
    const margin = CONFIG.PIPE_MIN_EDGE_MARGIN;
    const minY = margin + gap/2;
    const maxY = this.groundY - margin - gap/2;
    const gapY = Utils.rand(minY, maxY);
    const pipe = new Pipe(this.width + 40, gapY, gap, CONFIG.PIPE_WIDTH, Utils.randInt(0,10));
    this.pipes.push(pipe);

    if (Math.random() < CONFIG.COIN_CHANCE){
      this.coins.push(new Coin(pipe.x + pipe.width/2, gapY + Utils.rand(-gap*0.2, gap*0.2)));
    } else if (Math.random() < CONFIG.POWERUP_CHANCE){
      const type = Utils.choice(CONFIG.POWERUP_TYPES);
      this.powerups.push(new Powerup(pipe.x + pipe.width/2, gapY, type));
    }
  }

  // ---------------- UPDATE ----------------

  update(dt){
    if (this.state !== STATE.PLAYING) {
      Particles.update(dt);
      return;
    }

    const speed = this.currentPipeSpeed();
    this.distance += speed * dt * 0.05;

    // powerup timers
    for (const key of Object.keys(this.activePowerups)){
      this.activePowerups[key] -= dt;
      if (this.activePowerups[key] <= 0){
        delete this.activePowerups[key];
        if (key === 'tiny') this.bird.setTiny(false);
        if (this.onPowerupChange) this.onPowerupChange(this.activePowerups);
      }
    }

    this.bird.update(dt);
    const trailColor = TRAILS.find(t => t.id === Storage.data.selectedTrail)?.color;
    if (trailColor) Particles.trail(this.bird.x - this.bird.radius*0.6, this.bird.y, trailColor);

    // ground / ceiling collision
    if (this.bird.y + this.bird.radius >= this.groundY){
      this.bird.y = this.groundY - this.bird.radius;
      Particles.landingDust(this.bird.x, this.groundY);
      this._handleDeath();
      return;
    }
    if (this.bird.y - this.bird.radius <= 0){
      this.bird.y = this.bird.radius;
      this.bird.vy = 0;
    }

    // parallax
    this.cloudOffset -= CONFIG.PARALLAX_CLOUD_SPEED * dt;
    this.mountainOffset -= CONFIG.PARALLAX_MOUNTAIN_SPEED * dt;
    this.treeOffset -= CONFIG.PARALLAX_TREE_SPEED * dt;
    this.groundOffset -= speed * dt;

    // spawn pipes
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0){
      this._spawnPipe();
      const t = this._difficultyT();
      this.spawnTimer = Utils.lerp(CONFIG.PIPE_SPAWN_INTERVAL, CONFIG.PIPE_SPAWN_INTERVAL*0.68, t);
    }

    // update pipes
    for (const pipe of this.pipes){
      pipe.update(dt, speed);
      if (!pipe.passed && pipe.x + pipe.width < this.bird.x){
        pipe.passed = true;
        this._onPipePassed(pipe);
      }
      if (!this.activePowerups.shield && pipe.collides(this.bird)){
        this._handleDeath();
        return;
      }
    }
    this.pipes = this.pipes.filter(p => !p.offscreen());

    // coins
    const magnetActive = !!this.activePowerups.magnet;
    for (const coin of this.coins){
      coin.update(dt, speed);
      if (magnetActive){
        const dx = this.bird.x - coin.x, dy = this.bird.y - coin.y;
        const dist = Math.hypot(dx,dy);
        if (dist < 160){ coin.x += dx*dt*4; coin.y += dy*dt*4; }
      }
      if (!coin.collected && coin.collides(this.bird)){
        coin.collected = true;
        this._collectCoin(coin);
      }
    }
    this.coins = this.coins.filter(c => !c.collected && !c.offscreen());

    // powerups on field
    for (const pu of this.powerups){
      pu.update(dt, speed);
      if (!pu.collected && pu.collides(this.bird)){
        pu.collected = true;
        this._activatePowerup(pu.type);
      }
    }
    this.powerups = this.powerups.filter(p => !p.collected && !p.offscreen());

    // floating texts
    this.floatingTexts.forEach(f => { f.y -= 40*dt; f.life -= dt; });
    this.floatingTexts = this.floatingTexts.filter(f => f.life > 0);

    Particles.update(dt);

    if (this.shakeTime > 0) this.shakeTime -= dt;
  }

  _onPipePassed(pipe){
    this.combo++;
    const doubleMul = this.activePowerups.double ? 2 : 1;
    let gained = 1 * doubleMul;
    this.score += gained;
    AudioSys.score();
    this._emitScore();
    this._floatText(pipe.x + pipe.width/2, pipe.gapY, `+${gained}`, '#FFC857');

    // perfect pass: bird within 20% of gap center
    if (Math.abs(this.bird.y - pipe.gapY) < pipe.gapHeight * 0.18){
      const bonus = CONFIG.PERFECT_PASS_BONUS * doubleMul;
      this.score += bonus;
      this._emitScore();
      this._floatText(pipe.x + pipe.width/2, pipe.gapY - 26, `PERFECT +${bonus}`, '#5FE3C0');
    }
  }

  _collectCoin(coin){
    this.runCoins += CONFIG.COIN_VALUE;
    this._emitCoins();
    AudioSys.coin();
    Particles.coinSpark(coin.x, coin.y);
    this._floatText(coin.x, coin.y - 10, `+1`, '#FFE066');
  }

  _activatePowerup(type){
    this.activePowerups[type] = CONFIG.POWERUP_DURATION;
    AudioSys.powerup();
    Particles.powerupBurst(this.bird.x, this.bird.y, '#5FE3C0');
    if (type === 'tiny') this.bird.setTiny(true);
    if (this.onPowerupChange) this.onPowerupChange(this.activePowerups);
  }

  _floatText(x,y,text,color){
    this.floatingTexts.push({x,y,text,color,life:0.9, maxLife:0.9});
  }

  _handleDeath(){
    if (this.activePowerups.shield){
      delete this.activePowerups.shield;
      if (this.onPowerupChange) this.onPowerupChange(this.activePowerups);
      AudioSys.hit();
      this.shakeTime = 0.15; this.shakeMag = 6;
      return;
    }
    this.gameOver();
  }

  _emitScore(){ if (this.onScoreChange) this.onScoreChange(this.score); }
  _emitCoins(){ if (this.onCoinChange) this.onCoinChange(Storage.data.coins + this.runCoins); }

  // ---------------- RENDER ----------------

  render(){
    const ctx = this.ctx;
    const w = this.width, h = this.height;
    ctx.clearRect(0,0,w,h);

    let shakeX = 0, shakeY = 0;
    if (this.shakeTime > 0 && Storage.data.settings.shake){
      shakeX = Utils.rand(-1,1) * this.shakeMag * (this.shakeTime/0.3);
      shakeY = Utils.rand(-1,1) * this.shakeMag * (this.shakeTime/0.3);
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    this._drawSky(ctx, w, h);
    this._drawClouds(ctx, w, h);
    this._drawMountains(ctx, w, h);
    this._drawTrees(ctx, w, h);

    for (const pipe of this.pipes) pipe.draw(ctx, this.groundY);
    for (const coin of this.coins) coin.draw(ctx);
    for (const pu of this.powerups) pu.draw(ctx);

    this._drawGround(ctx, w, h);

    if (this.bird && (this.state === STATE.PLAYING || this.state === STATE.PAUSED || this.state === STATE.GAMEOVER)){
      if (this.activePowerups.shield){
        ctx.save();
        ctx.globalAlpha = 0.5 + Math.sin(performance.now()/150)*0.15;
        ctx.beginPath();
        ctx.arc(this.bird.x, this.bird.y, this.bird.radius*1.6, 0, Math.PI*2);
        ctx.strokeStyle = '#5FE3C0';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }
      this.bird.draw(ctx);
    }

    // floating texts
    ctx.textAlign = 'center';
    ctx.font = '700 18px Baloo 2, sans-serif';
    for (const f of this.floatingTexts){
      ctx.save();
      ctx.globalAlpha = Utils.clamp(f.life / f.maxLife, 0, 1);
      ctx.fillStyle = f.color;
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 4;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }

    ctx.restore();

    // particles on fx canvas (kept separate so they're not affected by shake jitter accumulation issues)
    this.fxCtx.clearRect(0,0,w,h);
    this.fxCtx.save();
    this.fxCtx.translate(shakeX, shakeY);
    Particles.draw(this.fxCtx);
    this.fxCtx.restore();
  }

  _skyColors(){
    const theme = THEMES.find(t => t.id === Storage.data.selectedTheme) || THEMES[0];
    if (theme.id !== 'day') return theme.sky;
    // day theme dynamically shifts day -> sunset -> night with score
    const t = Utils.clamp(this.score / 80, 0, 1);
    const stops = [
      ['#8ED1FC','#FFF6EA'],
      ['#FF8C61','#FFC857'],
      ['#150F26','#3B2E5A'],
    ];
    const idx = t < 0.5 ? 0 : (t < 0.85 ? 1 : 2);
    const nextIdx = Math.min(idx+1, 2);
    const localT = idx===0 ? t/0.5 : (idx===1 ? (t-0.5)/0.35 : 1);
    const top = this._lerpColor(stops[idx][0], stops[nextIdx][0], localT);
    const bot = this._lerpColor(stops[idx][1], stops[nextIdx][1], localT);
    return [top, bot];
  }

  _lerpColor(c1, c2, t){
    const a = this._hexToRgb(c1), b = this._hexToRgb(c2);
    const r = Math.round(Utils.lerp(a[0],b[0],t));
    const g = Math.round(Utils.lerp(a[1],b[1],t));
    const bl = Math.round(Utils.lerp(a[2],b[2],t));
    return `rgb(${r},${g},${bl})`;
  }
  _hexToRgb(hex){
    const h = hex.replace('#','');
    const n = parseInt(h.length===3? h.split('').map(c=>c+c).join(''):h,16);
    return [(n>>16)&255,(n>>8)&255,n&255];
  }

  _drawSky(ctx,w,h){
    const [top,bot] = this._skyColors();
    const g = ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0, top);
    g.addColorStop(1, bot);
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);

    // sun/moon
    const t = this.state===STATE.PLAYING||this.state===STATE.GAMEOVER ? Utils.clamp(this.score/80,0,1) : 0.1;
    const sunX = w*0.78, sunY = h*0.18 + t*40;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.shadowColor = t>0.85 ? '#B8C4FF' : '#FFE066';
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 34, 0, Math.PI*2);
    ctx.fillStyle = t>0.85 ? '#EDEFFF' : '#FFE066';
    ctx.fill();
    ctx.restore();

    if (t>0.85){
      // stars
      ctx.fillStyle='rgba(255,255,255,0.8)';
      for (let i=0;i<24;i++){
        const sx = (i*97 + this.cloudOffset*0.05) % w;
        const sy = (i*53) % (h*0.5);
        ctx.globalAlpha = 0.3 + (Math.sin(i*13 + performance.now()/600)+1)/2*0.5;
        ctx.fillRect(((sx%w)+w)%w, sy, 2, 2);
      }
      ctx.globalAlpha = 1;
    }
  }

  _drawClouds(ctx,w,h){
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i=0;i<5;i++){
      const baseX = (i*260 + this.cloudOffset) % (w+300) - 150;
      const x = ((baseX % (w+300)) + (w+300)) % (w+300) - 150;
      const y = h*0.12 + (i%3)*40;
      this._cloudShape(ctx, x, y, 1 + (i%2)*0.3);
    }
    ctx.restore();
  }
  _cloudShape(ctx,x,y,scale){
    ctx.beginPath();
    ctx.ellipse(x, y, 30*scale, 16*scale, 0, 0, Math.PI*2);
    ctx.ellipse(x+22*scale, y+4*scale, 22*scale, 14*scale, 0, 0, Math.PI*2);
    ctx.ellipse(x-22*scale, y+4*scale, 20*scale, 12*scale, 0, 0, Math.PI*2);
    ctx.fill();
  }

  _drawMountains(ctx,w,h){
    const baseY = this.groundY;
    ctx.save();
    ctx.fillStyle = 'rgba(60,50,90,0.35)';
    for (let i=0;i<3;i++){
      const offset = ((this.mountainOffset*0.6 + i*260) % (w+300)) - 150;
      this._mountainShape(ctx, offset, baseY, 140, 220);
    }
    ctx.restore();
  }
  _mountainShape(ctx,x,baseY,height,width){
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x+width*0.5, baseY-height);
    ctx.lineTo(x+width, baseY);
    ctx.closePath();
    ctx.fill();
  }

  _drawTrees(ctx,w,h){
    const baseY = this.groundY;
    ctx.save();
    ctx.fillStyle = 'rgba(63,181,138,0.55)';
    for (let i=0;i<8;i++){
      const offset = ((this.treeOffset + i*130) % (w+200)) - 100;
      ctx.beginPath();
      ctx.moveTo(offset, baseY);
      ctx.lineTo(offset+30, baseY-70-(i%3)*10);
      ctx.lineTo(offset+60, baseY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  _drawGround(ctx,w,h){
    const gh = h - this.groundY;
    const g = ctx.createLinearGradient(0,this.groundY,0,h);
    g.addColorStop(0, '#3FB58A');
    g.addColorStop(1, '#2E9270');
    ctx.fillStyle = g;
    ctx.fillRect(0, this.groundY, w, gh);

    // grass texture stripes
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    const stripeW = 26;
    let offset = this.groundOffset % stripeW;
    for (let x = offset - stripeW; x < w; x += stripeW){
      ctx.beginPath();
      ctx.moveTo(x, this.groundY);
      ctx.lineTo(x+14, this.groundY);
      ctx.lineTo(x+8, this.groundY+10);
      ctx.lineTo(x-2, this.groundY+10);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}
