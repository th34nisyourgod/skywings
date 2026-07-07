// achievements.js — checks stats against ACHIEVEMENTS defs and fires toasts.
const AchievementSys = {
  onUnlock: null, // callback(achievementDef)

  checkAll(){
    const s = Storage.data.stats;
    s.unlockedBirds = Storage.data.unlockedBirds;
    s.unlockedThemes = Storage.data.unlockedThemes;
    s.unlockedTrails = Storage.data.unlockedTrails;
    s.highScore = Storage.data.highScore;
    s.coinsCollected = s.coinsCollected || 0;

    const newly = [];
    for (const a of ACHIEVEMENTS){
      if (Storage.data.unlockedAchievements.includes(a.id)) continue;
      if (a.check(s)){
        Storage.data.unlockedAchievements.push(a.id);
        newly.push(a);
      }
    }
    if (newly.length){
      Storage.save();
      newly.forEach(a => { if (this.onUnlock) this.onUnlock(a); });
    }
    return newly;
  },
};
