// storage.js — single source of truth for persisted data (LocalStorage).
const Storage = {
  data: null,

  defaults(){
    return {
      coins: 0,
      highScore: 0,
      selectedBird: 'default',
      selectedTheme: 'day',
      selectedTrail: 'none',
      unlockedBirds: ['default'],
      unlockedThemes: ['day'],
      unlockedTrails: ['none'],
      unlockedAchievements: [],
      settings: {
        music: 60,
        sfx: 80,
        quality: 'high',
        particles: true,
        shake: true,
        dark: false,
      },
      leaderboard: [], // {score, coins, date}
      stats: {
        gamesPlayed: 0,
        highScore: 0,
        coinsCollected: 0,
        distance: 0,
        playTimeSec: 0,
        deaths: 0,
        bestCombo: 0,
        totalScore: 0,
      },
    };
  },

  load(){
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (!raw) { this.data = this.defaults(); this.save(); return this.data; }
      const parsed = JSON.parse(raw);
      // merge with defaults to survive future field additions
      const d = this.defaults();
      this.data = Object.assign(d, parsed, {
        settings: Object.assign(d.settings, parsed.settings || {}),
        stats: Object.assign(d.stats, parsed.stats || {}),
      });
      return this.data;
    } catch(e){
      console.warn('Save data corrupt, resetting.', e);
      this.data = this.defaults();
      this.save();
      return this.data;
    }
  },

  save(){
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.data));
    } catch(e){ console.warn('Could not save progress', e); }
  },

  reset(){
    this.data = this.defaults();
    this.save();
    return this.data;
  },

  addScoreEntry(score, coins){
    this.data.leaderboard.push({ score, coins, date: Date.now() });
    this.data.leaderboard.sort((a,b) => b.score - a.score);
    this.data.leaderboard = this.data.leaderboard.slice(0, 20);
    this.save();
  },
};
