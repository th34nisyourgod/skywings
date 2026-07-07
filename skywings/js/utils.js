// utils.js — small reusable helpers, no game state here.
const Utils = {
  rand(min, max){ return Math.random() * (max - min) + min; },
  randInt(min, max){ return Math.floor(Utils.rand(min, max + 1)); },
  choice(arr){ return arr[Math.floor(Math.random() * arr.length)]; },
  clamp(v, min, max){ return Math.max(min, Math.min(max, v)); },
  lerp(a, b, t){ return a + (b - a) * t; },

  circleRectCollide(cx, cy, r, rx, ry, rw, rh){
    const nx = Utils.clamp(cx, rx, rx + rw);
    const ny = Utils.clamp(cy, ry, ry + rh);
    const dx = cx - nx, dy = cy - ny;
    return (dx * dx + dy * dy) < (r * r);
  },

  circleCircleCollide(x1,y1,r1,x2,y2,r2){
    const dx = x1-x2, dy = y1-y2;
    return (dx*dx + dy*dy) < (r1+r2)*(r1+r2);
  },

  formatTime(sec){
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  },

  formatDate(ts){
    const d = new Date(ts);
    return `${d.getMonth()+1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
  },

  easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); },
  easeOutBack(t){ const c1=1.70158,c3=c1+1; return 1 + c3*Math.pow(t-1,3) + c1*Math.pow(t-1,2); },

  fxScale(){
    const q = (typeof Storage !== 'undefined' && Storage.data) ? Storage.data.settings.quality : 'high';
    return q === 'low' ? 0 : (q === 'medium' ? 0.5 : 1);
  },

  hexToRgba(hex, alpha){
    const h = hex.replace('#','');
    const bigint = parseInt(h.length===3 ? h.split('').map(c=>c+c).join('') : h, 16);
    const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  },
};
