// entities.js — Bird, Pipe, Coin, Powerup.

class Bird{
  constructor(x, y, skin){
    this.x = x; this.y = y;
    this.vy = 0;
    this.rotation = 0;
    this.flapPhase = 0;
    this.setSkin(skin);
    this.scale = 1;
    this.alive = true;
    this.tinyTimer = 0;
  }

  setSkin(skin){
    const def = BIRD_SKINS.find(b => b.id === skin) || BIRD_SKINS[0];
    this.colors = def.colors;
  }

  get radius(){ return CONFIG.BIRD_RADIUS * this.scale; }

  flap(){
    this.vy = CONFIG.FLAP_VELOCITY;
    this.flapPhase = 1;
  }

  setTiny(active){
    this.scale = active ? 0.55 : 1;
  }

  update(dt){
    this.vy += CONFIG.GRAVITY * dt;
    this.vy = Utils.clamp(this.vy, -9999, CONFIG.MAX_FALL_SPEED);
    this.y += this.vy * dt;

    const targetRot = this.vy < 0 ? CONFIG.ROTATION_UP : Utils.clamp(this.vy / CONFIG.MAX_FALL_SPEED, 0, 1) * CONFIG.ROTATION_DOWN;
    this.rotation = Utils.lerp(this.rotation, targetRot, Math.min(1, CONFIG.ROTATION_SPEED * dt));

    this.flapPhase = Math.max(0, this.flapPhase - dt * 3.4);
  }

  draw(ctx){
    const wingFlap = Math.sin(this.flapPhase * Math.PI) * 0.9;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    const r = this.radius;

    // shadow / glow
    ctx.save();
    ctx.shadowColor = this.colors[0];
    ctx.shadowBlur = 18 * Utils.fxScale();
    ctx.beginPath();
    ctx.ellipse(0, 0, r*1.05, r*0.92, 0, 0, Math.PI*2);
    const bodyGrad = ctx.createLinearGradient(-r, -r, r, r);
    bodyGrad.addColorStop(0, this.colors[0]);
    bodyGrad.addColorStop(1, this.colors[this.colors.length-1]);
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.restore();

    // belly highlight
    ctx.beginPath();
    ctx.ellipse(-r*0.15, r*0.25, r*0.62, r*0.5, 0, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fill();

    // wing
    ctx.save();
    ctx.translate(-r*0.15, r*0.05);
    ctx.rotate(-0.3 - wingFlap);
    ctx.beginPath();
    ctx.ellipse(0, 0, r*0.75, r*0.42, 0, 0, Math.PI*2);
    ctx.fillStyle = Utils.hexToRgba(this.colors[this.colors.length-1], 0.95);
    ctx.fill();
    ctx.restore();

    // eye
    ctx.beginPath();
    ctx.arc(r*0.42, -r*0.18, r*0.22, 0, Math.PI*2);
    ctx.fillStyle = '#2B2140';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r*0.48, -r*0.24, r*0.07, 0, Math.PI*2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // beak
    ctx.beginPath();
    ctx.moveTo(r*0.85, 0);
    ctx.lineTo(r*1.35, r*0.12);
    ctx.lineTo(r*0.85, r*0.32);
    ctx.closePath();
    ctx.fillStyle = '#FF9F43';
    ctx.fill();

    ctx.restore();
  }
}

class Pipe{
  constructor(x, gapY, gapHeight, width, decoSeed){
    this.x = x;
    this.gapY = gapY;
    this.gapHeight = gapHeight;
    this.width = width;
    this.passed = false;
    this.decoSeed = decoSeed;
  }

  get topHeight(){ return this.gapY - this.gapHeight/2; }
  get bottomY(){ return this.gapY + this.gapHeight/2; }

  update(dt, speed){ this.x -= speed * dt; }

  offscreen(){ return this.x + this.width < -20; }

  collides(bird){
    const r = bird.radius * 0.82;
    if (Utils.circleRectCollide(bird.x, bird.y, r, this.x, -20, this.width, this.topHeight + 20)) return true;
    if (Utils.circleRectCollide(bird.x, bird.y, r, this.x, this.bottomY, this.width, 4000)) return true;
    return false;
  }

  draw(ctx, groundY, theme){
    const w = this.width;
    const capH = 26;
    const bodyGrad = ctx.createLinearGradient(this.x, 0, this.x + w, 0);
    bodyGrad.addColorStop(0, '#3FB58A');
    bodyGrad.addColorStop(0.5, '#5FE3C0');
    bodyGrad.addColorStop(1, '#39A57C');

    const drawSeg = (y, h) => {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 10 * Utils.fxScale();
      ctx.fillStyle = bodyGrad;
      roundRect(ctx, this.x, y, w, h, 12);
      ctx.fill();
      ctx.restore();
      // highlight stripe
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      roundRect(ctx, this.x + 6, y, 8, h, 4);
      ctx.fill();
    };

    // top pipe
    drawSeg(0, Math.max(0,this.topHeight - capH));
    // top cap
    ctx.fillStyle = '#2E9270';
    roundRect(ctx, this.x - 5, this.topHeight - capH, w + 10, capH, 8);
    ctx.fill();

    // bottom pipe
    const bottomH = groundY - this.bottomY - capH;
    drawSeg(this.bottomY + capH, Math.max(0,bottomH));
    ctx.fillStyle = '#2E9270';
    roundRect(ctx, this.x - 5, this.bottomY, w + 10, capH, 8);
    ctx.fill();

    // decoration (little leaf) seeded by decoSeed for variety, deterministic
    if (this.decoSeed % 3 === 0){
      ctx.fillStyle = '#FFC857';
      ctx.beginPath();
      ctx.ellipse(this.x + w*0.5, this.topHeight - capH*0.5, 6, 4, 0.5, 0, Math.PI*2);
      ctx.fill();
    }
  }
}

function roundRect(ctx, x, y, w, h, r){
  if (h <= 0) { return; }
  r = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

class Coin{
  constructor(x,y){
    this.x = x; this.y = y;
    this.collected = false;
    this.spin = Utils.rand(0, Math.PI*2);
    this.bob = Utils.rand(0, Math.PI*2);
    this.radius = 11;
  }
  update(dt, speed){
    this.x -= speed * dt;
    this.spin += dt * 6;
    this.bob += dt * 3;
  }
  offscreen(){ return this.x < -30; }
  collides(bird){
    return Utils.circleCircleCollide(this.x, this.y + Math.sin(this.bob)*4, this.radius, bird.x, bird.y, bird.radius);
  }
  draw(ctx){
    const y = this.y + Math.sin(this.bob)*4;
    const squish = Math.abs(Math.cos(this.spin));
    ctx.save();
    ctx.translate(this.x, y);
    ctx.scale(Utils.clamp(squish,0.25,1), 1);
    ctx.shadowColor = '#FFC857';
    ctx.shadowBlur = 14 * Utils.fxScale();
    const g = ctx.createLinearGradient(-this.radius,0,this.radius,0);
    g.addColorStop(0,'#FFE066'); g.addColorStop(1,'#FFB627');
    ctx.beginPath();
    ctx.arc(0,0,this.radius,0,Math.PI*2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}

class Powerup{
  constructor(x,y,type){
    this.x = x; this.y = y;
    this.type = type;
    this.collected = false;
    this.bob = Utils.rand(0,Math.PI*2);
    this.radius = 15;
  }
  update(dt, speed){ this.x -= speed*dt; this.bob += dt*3; }
  offscreen(){ return this.x < -30; }
  collides(bird){
    return Utils.circleCircleCollide(this.x, this.y + Math.sin(this.bob)*5, this.radius, bird.x, bird.y, bird.radius);
  }
  draw(ctx){
    const y = this.y + Math.sin(this.bob)*5;
    ctx.save();
    ctx.translate(this.x, y);
    ctx.shadowColor = '#5FE3C0';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(0,0,this.radius,0,Math.PI*2);
    ctx.fillStyle = 'rgba(21,15,38,0.75)';
    ctx.fill();
    ctx.strokeStyle = '#5FE3C0';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(this.x, y);
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(POWERUP_INFO[this.type].icon, 0, 1);
    ctx.restore();
  }
}
