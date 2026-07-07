// audio.js — everything is synthesized with WebAudio, zero external asset files.
const AudioSys = {
  ctx: null,
  musicGain: null,
  sfxGain: null,
  musicTimer: null,
  musicStep: 0,
  muted: false,
  enabled: false,

  init(){
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
      this.setMusicVolume(Storage.data.settings.music);
      this.setSfxVolume(Storage.data.settings.sfx);
      this.enabled = true;
    } catch(e){ console.warn('WebAudio unavailable', e); }
  },

  resume(){
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  setMusicVolume(v){ if (this.musicGain) this.musicGain.gain.value = this.muted ? 0 : (v/100) * 0.35; },
  setSfxVolume(v){ if (this.sfxGain) this.sfxGain.gain.value = this.muted ? 0 : (v/100) * 0.6; },

  toggleMute(){
    this.muted = !this.muted;
    this.setMusicVolume(Storage.data.settings.music);
    this.setSfxVolume(Storage.data.settings.sfx);
    return this.muted;
  },

  _tone(freq, dur, type='sine', gainMul=1, delay=0, glideTo=null){
    if (!this.enabled) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gainMul, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  },

  jump(){ this._tone(520, 0.14, 'square', 0.5, 0, 760); },
  coin(){ this._tone(880, 0.09, 'sine', 0.5, 0); this._tone(1320, 0.12, 'sine', 0.4, 0.06); },
  score(){ this._tone(660, 0.1, 'triangle', 0.45, 0); this._tone(990, 0.14, 'triangle', 0.35, 0.05); },
  powerup(){ this._tone(300, 0.16, 'sawtooth', 0.35, 0, 900); this._tone(500, 0.2, 'sine', 0.3, 0.1, 1200); },
  death(){ this._tone(220, 0.3, 'sawtooth', 0.5, 0, 60); },
  hit(){ this._tone(140, 0.18, 'square', 0.5, 0); },
  click(){ this._tone(700, 0.05, 'square', 0.25, 0); },
  achievement(){ this._tone(523,0.12,'triangle',0.4,0); this._tone(659,0.12,'triangle',0.4,0.1); this._tone(784,0.2,'triangle',0.45,0.2); },

  startMusic(){
    if (!this.enabled || this.musicTimer) return;
    this.resume();
    const scale = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3]; // C major pentatonic-ish
    this.musicStep = 0;
    const playStep = () => {
      const note = Utils.choice(scale) / 2;
      this._toneMusic(note, 0.8);
      this.musicStep++;
    };
    playStep();
    this.musicTimer = setInterval(playStep, 900);
  },

  _toneMusic(freq, dur){
    if (!this.enabled) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.5, t0 + 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g); g.connect(this.musicGain);
    osc.start(t0); osc.stop(t0 + dur + 0.1);
  },

  stopMusic(){
    if (this.musicTimer){ clearInterval(this.musicTimer); this.musicTimer = null; }
  },
};
