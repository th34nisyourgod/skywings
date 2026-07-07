// ui.js — DOM glue: screens, HUD, shop, settings, leaderboard, toasts.
const UI = {
  els: {},

  init(game){
    this.game = game;
    this.cacheEls();
    this.bindGlobalButtons();
    this.bindSettings();
    this.bindTabs();
    this.renderMenuStats();
  },

  cacheEls(){
    const q = id => document.getElementById(id);
    this.els = {
      screens: document.querySelectorAll('.screen'),
      loading: q('screen-loading'), loadingFill: q('loading-fill'),
      menu: q('screen-menu'), menuHighscore: q('menu-highscore'), menuCoins: q('menu-coins'),
      hud: q('hud'), hudScore: q('hud-score'), hudCoins: q('hud-coins'), hudHighscore: q('hud-highscore'),
      fps: q('fps-counter'), powerupSlot: q('powerup-slot'),
      tapHint: q('tap-hint'),
      pause: q('screen-pause'), gameover: q('screen-gameover'),
      settings: q('screen-settings'), leaderboard: q('screen-leaderboard'), shop: q('screen-shop'), howto: q('screen-howto'),
      goScore: q('go-score'), goBest: q('go-best'), goCoins: q('go-coins'), goNewBest: q('go-new-best'), goTitle: q('gameover-title'),
      scoreList: q('score-list'), statsGrid: q('stats-grid'), achvGrid: q('achv-grid'),
      shopBirds: q('shop-birds'), shopThemes: q('shop-themes'), shopTrails: q('shop-trails'), shopCoins: q('shop-coins'),
      toast: q('achv-toast'), toastName: q('achv-toast-name'),
      muteBtn: q('menu-mute-btn'), pauseBtn: q('pause-btn'),
    };
  },

  showScreen(id){
    this.els.screens.forEach(s => s.classList.remove('active'));
    if (id) document.getElementById(id).classList.add('active');
  },

  bindGlobalButtons(){
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      AudioSys.init(); AudioSys.resume();
      const action = btn.dataset.action;
      this.handleAction(action);
    });
  },

  handleAction(action){
    AudioSys.click();
    const g = this.game;
    switch(action){
      case 'play':
        this.showScreen(null);
        this.els.hud.classList.add('active');
        g.startRun();
        this.showTapHint(true);
        break;
      case 'retry':
        this.showScreen(null);
        this.els.hud.classList.add('active');
        g.startRun();
        break;
      case 'resume': g.resume(); this.showScreen(null); this.els.hud.classList.add('active'); break;
      case 'quit-menu':
        this.els.hud.classList.remove('active');
        AudioSys.stopMusic();
        g.setState(STATE.MENU);
        this.renderMenuStats();
        this.showScreen('screen-menu');
        break;
      case 'settings':
        this._settingsReturnTo = g.state === STATE.PAUSED ? 'pause' : 'menu';
        this.showScreen('screen-settings');
        break;
      case 'close-settings':
        this.showScreen(this._settingsReturnTo === 'pause' ? 'screen-pause' : 'screen-menu');
        break;
      case 'leaderboard':
        this.renderLeaderboard(); this.renderStats(); this.renderAchievements();
        this.showScreen('screen-leaderboard');
        break;
      case 'close-leaderboard': this.showScreen('screen-menu'); break;
      case 'shop':
        this.renderShop();
        this.showScreen('screen-shop');
        break;
      case 'close-shop': this.renderMenuStats(); this.showScreen('screen-menu'); break;
      case 'howto': this.showScreen('screen-howto'); break;
      case 'close-howto': this.showScreen('screen-menu'); break;
      case 'mute': {
        const muted = AudioSys.toggleMute();
        this.els.muteBtn.textContent = muted ? '🔇' : '🔊';
        break;
      }
      case 'reset-progress':
        if (confirm('Reset all progress? This cannot be undone.')){
          Storage.reset();
          this.renderMenuStats();
          this.applySettingsToInputs();
        }
        break;
    }
  },

  showTapHint(show){
    this.els.tapHint.classList.toggle('active', show);
  },

  bindSettings(){
    const s = Storage.data.settings;
    this.applySettingsToInputs();
    document.getElementById('set-music').addEventListener('input', e => {
      s.music = +e.target.value; AudioSys.setMusicVolume(s.music); Storage.save();
    });
    document.getElementById('set-sfx').addEventListener('input', e => {
      s.sfx = +e.target.value; AudioSys.setSfxVolume(s.sfx); Storage.save();
      AudioSys.click();
    });
    document.getElementById('set-quality').addEventListener('change', e => { s.quality = e.target.value; Storage.save(); });
    document.getElementById('set-particles').addEventListener('change', e => { s.particles = e.target.checked; Storage.save(); });
    document.getElementById('set-shake').addEventListener('change', e => { s.shake = e.target.checked; Storage.save(); });
    document.getElementById('set-dark').addEventListener('change', e => {
      s.dark = e.target.checked; Storage.save();
      document.body.classList.toggle('dark-mode', s.dark);
    });
  },

  applySettingsToInputs(){
    const s = Storage.data.settings;
    document.getElementById('set-music').value = s.music;
    document.getElementById('set-sfx').value = s.sfx;
    document.getElementById('set-quality').value = s.quality;
    document.getElementById('set-particles').checked = s.particles;
    document.getElementById('set-shake').checked = s.shake;
    document.getElementById('set-dark').checked = s.dark;
  },

  bindTabs(){
    document.querySelectorAll('.tabs').forEach(tabGroup => {
      tabGroup.addEventListener('click', e => {
        const tab = e.target.closest('.tab');
        if (!tab) return;
        AudioSys.click();
        const panelRoot = tabGroup.parentElement;
        tabGroup.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        panelRoot.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        panelRoot.querySelector('#tab-' + tab.dataset.tab).classList.add('active');
      });
    });
  },

  // ---------------- MENU / HUD ----------------

  renderMenuStats(){
    this.els.menuHighscore.textContent = Storage.data.highScore;
    this.els.menuCoins.textContent = Storage.data.coins;
    this.els.muteBtn.textContent = AudioSys.muted ? '🔇' : '🔊';
  },

  updateHUD(score, coins){
    this.els.hudScore.textContent = score;
    this.els.hudCoins.textContent = coins;
    this.els.hudHighscore.textContent = Math.max(Storage.data.highScore, score);
  },

  updateFPS(fps){
    this.els.fps.textContent = `${Math.round(fps)} FPS`;
  },

  updatePowerups(active){
    const slot = this.els.powerupSlot;
    slot.innerHTML = '';
    for (const [type, time] of Object.entries(active)){
      const info = POWERUP_INFO[type];
      if (!info) continue;
      const pct = Math.max(0, Math.min(100, (time / CONFIG.POWERUP_DURATION) * 100));
      const div = document.createElement('div');
      div.className = 'powerup-badge';
      div.innerHTML = `<div class="pu-ring" style="--p:${pct}%"></div><span>${info.icon}</span>`;
      slot.appendChild(div);
    }
  },

  // ---------------- GAME OVER ----------------

  showGameOver({score, coins, isNewBest}){
    this.els.hud.classList.remove('active');
    this.showTapHint(false);
    this.els.goScore.textContent = score;
    this.els.goBest.textContent = Storage.data.highScore;
    this.els.goCoins.textContent = coins;
    this.els.goNewBest.classList.toggle('hidden', !isNewBest);
    this.els.goTitle.textContent = isNewBest ? 'New Record!' : 'Game Over';
    this.showScreen('screen-gameover');
  },

  // ---------------- LEADERBOARD ----------------

  renderLeaderboard(){
    const list = Storage.data.leaderboard;
    const el = this.els.scoreList;
    el.innerHTML = '';
    if (!list.length){
      el.innerHTML = '<div class="empty-note">No runs yet — go fly!</div>';
      return;
    }
    list.forEach((entry, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="rank">#${i+1}</span><span class="sc">${entry.score} pts</span><span class="dt">🪙${entry.coins} · ${Utils.formatDate(entry.date)}</span>`;
      el.appendChild(li);
    });
  },

  renderStats(){
    const s = Storage.data.stats;
    const cards = [
      ['Games Played', s.gamesPlayed],
      ['Highest Score', Storage.data.highScore],
      ['Coins Collected', s.coinsCollected],
      ['Distance', Math.floor(s.distance) + 'm'],
      ['Play Time', Utils.formatTime(s.playTimeSec)],
      ['Deaths', s.deaths],
      ['Best Combo', s.bestCombo],
      ['Avg Score', s.gamesPlayed ? Math.round(s.totalScore / s.gamesPlayed) : 0],
    ];
    this.els.statsGrid.innerHTML = cards.map(([label,val]) =>
      `<div class="stat-card"><b>${val}</b><span>${label}</span></div>`).join('');
  },

  renderAchievements(){
    const unlocked = Storage.data.unlockedAchievements;
    this.els.achvGrid.innerHTML = ACHIEVEMENTS.map(a => {
      const done = unlocked.includes(a.id);
      return `<div class="achv-card ${done?'unlocked':''}">
        <div class="achv-icon">${done ? a.icon : '🔒'}</div>
        <div><div class="achv-name">${a.name}</div><div class="achv-desc">${a.desc}</div></div>
      </div>`;
    }).join('');
  },

  showAchievementToast(a){
    this.els.toastName.textContent = a.name;
    this.els.toast.classList.add('show');
    AudioSys.achievement();
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.els.toast.classList.remove('show'), 3200);
  },

  // ---------------- SHOP ----------------

  renderShop(){
    this.els.shopCoins.textContent = Storage.data.coins;
    this._renderShopGrid(this.els.shopBirds, BIRD_SKINS, 'unlockedBirds', 'selectedBird', (item, div) => {
      const preview = div.querySelector('.preview');
      preview.style.background = `linear-gradient(135deg, ${item.colors[0]}, ${item.colors[item.colors.length-1]})`;
    });
    this._renderShopGrid(this.els.shopThemes, THEMES, 'unlockedThemes', 'selectedTheme', (item, div) => {
      const preview = div.querySelector('.preview');
      preview.style.background = `linear-gradient(135deg, ${item.sky[0]}, ${item.sky[1]})`;
    });
    this._renderShopGrid(this.els.shopTrails, TRAILS, 'unlockedTrails', 'selectedTrail', (item, div) => {
      const preview = div.querySelector('.preview');
      preview.style.background = item.color === 'rainbow'
        ? 'conic-gradient(#FF5D5D,#FFC857,#5FE3C0,#5AC8FA,#B537F2,#FF5D5D)'
        : (item.color || 'rgba(255,255,255,0.2)');
    });
  },

  _renderShopGrid(container, items, unlockedKey, selectedKey, previewFn){
    container.innerHTML = '';
    items.forEach(item => {
      const owned = Storage.data[unlockedKey].includes(item.id);
      const selected = Storage.data[selectedKey] === item.id;
      const div = document.createElement('div');
      div.className = 'shop-item' + (selected ? ' selected' : '');
      div.innerHTML = `<div class="preview"></div><div class="name">${item.name}</div>
        <div class="price ${owned ? 'owned' : 'locked'}">${owned ? (selected ? 'Equipped' : 'Owned') : ('🪙 ' + item.price)}</div>`;
      previewFn(item, div);
      div.addEventListener('click', () => {
        AudioSys.click();
        if (owned){
          Storage.data[selectedKey] = item.id;
          Storage.save();
          this.renderShop();
        } else if (Storage.data.coins >= item.price){
          Storage.data.coins -= item.price;
          Storage.data[unlockedKey].push(item.id);
          Storage.data[selectedKey] = item.id;
          Storage.save();
          AchievementSys.checkAll();
          this.renderShop();
        } else {
          div.animate([{transform:'translateX(0)'},{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'translateX(0)'}], {duration:250});
        }
      });
      container.appendChild(div);
    });
  },
};
