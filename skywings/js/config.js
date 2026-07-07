// config.js — all tunable constants live here, nowhere else.
const CONFIG = {
  STORAGE_KEY: 'skywings_save_v1',

  // Physics (values are per-second; multiplied by deltaTime at runtime)
  GRAVITY: 1500,
  FLAP_VELOCITY: -430,
  MAX_FALL_SPEED: 780,
  ROTATION_UP: -0.45,
  ROTATION_DOWN: 1.3,
  ROTATION_SPEED: 9,

  BIRD_RADIUS: 16,
  BIRD_X_RATIO: 0.30,

  // Pipes
  PIPE_WIDTH: 78,
  PIPE_GAP_START: 190,
  PIPE_GAP_MIN: 128,
  PIPE_GAP_SHRINK_PER_SCORE: 0.55,
  PIPE_SPEED_START: 200,
  PIPE_SPEED_MAX: 420,
  PIPE_SPEED_GAIN_PER_SCORE: 2.2,
  PIPE_SPAWN_INTERVAL: 1.55, // seconds, scales with speed
  PIPE_MIN_EDGE_MARGIN: 90,

  // Coins / powerups
  COIN_CHANCE: 0.65,        // chance a coin spawns per pipe gap
  POWERUP_CHANCE: 0.10,
  COIN_VALUE: 1,
  PERFECT_PASS_BONUS: 2,
  COMBO_SCORE_BONUS: 1,     // extra bonus per consecutive pipe streak (capped)
  COMBO_MAX_BONUS: 5,

  POWERUP_TYPES: ['shield','slowmo','magnet','double','tiny'],
  POWERUP_DURATION: 7,

  // Difficulty ramps (score-based, gentle curve, capped)
  MAX_DIFFICULTY_SCORE: 60,

  // Visual
  PARALLAX_CLOUD_SPEED: 14,
  PARALLAX_MOUNTAIN_SPEED: 26,
  PARALLAX_TREE_SPEED: 60,
  GROUND_HEIGHT_RATIO: 0.12,

  FPS_SAMPLE: 20,
};

const BIRD_SKINS = [
  { id:'default', name:'Sunfeather', price:0, colors:['#FFC857','#FF8C61'] },
  { id:'blue',    name:'Sky Blue',   price:150,  colors:['#5AC8FA','#3B82F6'] },
  { id:'red',     name:'Cardinal',   price:150,  colors:['#FF5D5D','#C0392B'] },
  { id:'golden',  name:'Golden',     price:400,  colors:['#FFE066','#FFB627'] },
  { id:'cyber',   name:'Cyber',      price:600,  colors:['#5FE3C0','#0FF0FC'] },
  { id:'neon',    name:'Neon',       price:600,  colors:['#FF2E92','#B537F2'] },
  { id:'space',   name:'Space',      price:800,  colors:['#2E2A5A','#8E7CC3'] },
  { id:'dragon',  name:'Dragon',     price:1000, colors:['#E63946','#6A040F'] },
  { id:'rainbow', name:'Rainbow',    price:1500, colors:['#FF5D5D','#FFC857','#5FE3C0','#5AC8FA','#B537F2'] },
];

const THEMES = [
  { id:'day',    name:'Day',    price:0,   sky:['#8ED1FC','#FFF6EA'] },
  { id:'sunset', name:'Sunset', price:200, sky:['#FF8C61','#FFC857'] },
  { id:'night',  name:'Night',  price:300, sky:['#150F26','#3B2E5A'] },
  { id:'snow',   name:'Snow',   price:350, sky:['#B8D8E8','#EAF6FB'] },
  { id:'forest', name:'Forest', price:350, sky:['#3E7C59','#A8D8B9'] },
  { id:'city',   name:'City',   price:450, sky:['#6D6875','#B5A9C4'] },
  { id:'space',  name:'Space',  price:700, sky:['#0B0B2A','#3B1F5C'] },
  { id:'ocean',  name:'Ocean',  price:450, sky:['#0077B6','#90E0EF'] },
];

const TRAILS = [
  { id:'none',   name:'None',    price:0,   color:null },
  { id:'gold',   name:'Gold Dust',  price:200, color:'#FFC857' },
  { id:'mint',   name:'Mint Trail', price:200, color:'#5FE3C0' },
  { id:'fire',   name:'Fire',       price:400, color:'#FF5D5D' },
  { id:'rainbow',name:'Prism',      price:900, color:'rainbow' },
];

const ACHIEVEMENTS = [
  { id:'first_flight', name:'First Flight',   desc:'Play your first game',       icon:'🕊️', check: s => s.gamesPlayed >= 1 },
  { id:'score_10',     name:'Getting Airborne', desc:'Score 10 in one run',      icon:'⭐', check: s => s.highScore >= 10 },
  { id:'score_50',     name:'Sky Master',     desc:'Score 50 in one run',        icon:'🌟', check: s => s.highScore >= 50 },
  { id:'score_100',    name:'Legendary Wings',desc:'Score 100 in one run',       icon:'👑', check: s => s.highScore >= 100 },
  { id:'coins_100',    name:'Coin Collector', desc:'Collect 100 coins total',    icon:'🪙', check: s => s.coinsCollected >= 100 },
  { id:'coins_1000',   name:'Treasure Hoard', desc:'Collect 1000 coins total',   icon:'💰', check: s => s.coinsCollected >= 1000 },
  { id:'games_100',    name:'Dedicated Flyer',desc:'Play 100 games',             icon:'🎮', check: s => s.gamesPlayed >= 100 },
  { id:'playtime_10h', name:'Sky Veteran',    desc:'Play for 10 hours total',    icon:'⏱️', check: s => s.playTimeSec >= 36000 },
  { id:'all_birds',    name:'Flock Master',   desc:'Unlock every bird skin',     icon:'🦜', check: s => s.unlockedBirds && s.unlockedBirds.length >= BIRD_SKINS.length },
  { id:'everything',   name:'Sky Wings Champion', desc:'Unlock everything',      icon:'🏆', check: s => s.unlockedBirds && s.unlockedThemes && s.unlockedTrails &&
      s.unlockedBirds.length >= BIRD_SKINS.length && s.unlockedThemes.length >= THEMES.length && s.unlockedTrails.length >= TRAILS.length },
];

const POWERUP_INFO = {
  shield:  { icon:'🛡️', label:'Shield' },
  slowmo:  { icon:'🐌', label:'Slow-Mo' },
  magnet:  { icon:'🧲', label:'Magnet' },
  double:  { icon:'✨', label:'2x Score' },
  tiny:    { icon:'🔹', label:'Tiny Bird' },
};
