// particles.js — lightweight pooled particle system.
class Particle{
  constructor(){ this.active = false; }

  spawn(opts){
    this.x = opts.x; this.y = opts.y;
    this.vx = opts.vx; this.vy = opts.vy;
    this.life = this.maxLife = opts.life;
    this.size = opts.size;
    this.color = opts.color;
    this.type = opts.type || 'circle'; // circle, feather, spark, square
    this.gravity = opts.gravity || 0;
    this.drag = opts.drag != null ? opts.drag : 0.98;
    this.rotation = opts.rotation || 0;
    this.rotSpeed = opts.rotSpeed || 0;
    this.active = true;
    return this;
  }

  update(dt){
    if (!this.active) return;
    this.life -= dt;
    if (this.life <= 0){ this.active = false; return; }
    this.vy += this.gravity * dt;
    this.vx *= Math.pow(this.drag, dt * 60);
    this.vy *= Math.pow(this.drag, dt * 60);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotSpeed * dt;
  }

  draw(ctx){
    if (!this.active) return;
    const t = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = Utils.clamp(t, 0, 1);
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;
    const s = this.size * (0.5 + t*0.5);
    if (this.type === 'feather'){
      ctx.beginPath();
      ctx.ellipse(0, 0, s, s*0.4, 0, 0, Math.PI*2);
      ctx.fill();
    } else if (this.type === 'spark'){
      ctx.beginPath();
      ctx.moveTo(-s, 0); ctx.lineTo(0, -s*0.4); ctx.lineTo(s, 0); ctx.lineTo(0, s*0.4);
      ctx.closePath(); ctx.fill();
    } else if (this.type === 'square'){
      ctx.fillRect(-s/2, -s/2, s, s);
    } else {
      ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
}

const Particles = {
  pool: [],
  maxPool: 260,

  init(){
    this.pool = Array.from({length: this.maxPool}, () => new Particle());
  },

  _get(){
    return this.pool.find(p => !p.active) || null;
  },

  emit(x, y, opts){
    if (!Storage.data.settings.particles || Utils.fxScale() === 0) return;
    const p = this._get();
    if (p) p.spawn(Object.assign({x,y}, opts));
  },

  burst(x, y, count, opts){
    if (!Storage.data.settings.particles || Utils.fxScale() === 0) return;
    count = Math.max(1, Math.round(count * (Utils.fxScale() || 1)));
    for (let i=0;i<count;i++){
      const p = this._get();
      if (!p) break;
      const angle = Utils.rand(0, Math.PI*2);
      const speed = Utils.rand(opts.speedMin||60, opts.speedMax||220);
      p.spawn(Object.assign({
        x, y,
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed,
      }, opts));
    }
  },

  feather(x, y){
    this.emit(x, y, {
      vx: Utils.rand(-40,-10), vy: Utils.rand(-30,30),
      life: Utils.rand(0.5,0.9), size: Utils.rand(4,7),
      color: Utils.choice(['#FFC857','#FF8C61','#FFF6EA']),
      type:'feather', gravity: 140, drag:0.96, rotSpeed: Utils.rand(-4,4),
    });
  },

  coinSpark(x,y){
    this.burst(x,y,8,{ life:0.4, size:3, color:'#FFC857', type:'spark', gravity:0, drag:0.9, speedMin:40, speedMax:140 });
  },

  landingDust(x,y){
    this.burst(x,y,10,{ life:0.5, size:5, color:'rgba(255,246,234,0.7)', type:'circle', gravity:60, drag:0.9, speedMin:30, speedMax:100 });
  },

  deathExplosion(x,y,colors){
    this.burst(x,y,30,{ life:0.8, size:6, color: Utils.choice(colors||['#FF5D5D','#FFC857','#FF8C61']), type:'feather', gravity:220, drag:0.94, speedMin:80, speedMax:320, rotSpeed:6 });
  },

  powerupBurst(x,y,color){
    this.burst(x,y,18,{ life:0.6, size:5, color, type:'spark', gravity:0, drag:0.92, speedMin:60, speedMax:200 });
  },

  trail(x,y,color){
    if (!color) return;
    if (color === 'rainbow') color = Utils.choice(['#FF5D5D','#FFC857','#5FE3C0','#5AC8FA','#B537F2']);
    this.emit(x,y,{ vx:Utils.rand(-20,20), vy:Utils.rand(-10,10), life:0.35, size:Utils.rand(3,5), color, type:'circle', gravity:0, drag:0.9 });
  },

  update(dt){ for (const p of this.pool) p.update(dt); },
  draw(ctx){ for (const p of this.pool) p.draw(ctx); },
  clear(){ for (const p of this.pool) p.active = false; },
};
