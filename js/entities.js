'use strict';
// MineBomb - entity definitions, creation, damage, serialization
(function () {
  const U = MB.util, T = MB.T, TILES = MB.TILES;
  const DEFS = {};
  const ENTITY_CAP = 6000;

  // ai keys are implemented in ai.js
  function def(key, o) {
    DEFS[key] = Object.assign({
      key, name: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), icon: '❓', kind: 'animal', ai: 'wander', hp: 10,
      speed: 0.04, habitat: 'land', dmg: 0, range: 1.1, life: 0, sprite: key, scale: 1, breed: 0, prey: null,
      atkCd: 20, aggroR: 8, wanderR: 6, biomes: null, recolor: null, desc: '', livestock: false, hostile: false,
    }, o);
    if (!MB.SPR[DEFS[key].sprite]) DEFS[key].sprite = 'generic';
  }

  // ---------------- HUMANS ----------------
  def('human', { name: 'Human', icon: '🧍', kind: 'human', ai: 'civilian', hp: 20, speed: 0.045, life: 0, desc: 'A regular person. Lives in a civilization or wanders the wilds.' });
  def('soldier', { name: 'Soldier', icon: '⚔️', kind: 'human', ai: 'soldier', hp: 40, dmg: 8, speed: 0.05, atkCd: 18, desc: 'Fights for their civilization.' });
  def('settler', { name: 'Settler', icon: '🎒', kind: 'human', ai: 'settler', hp: 20, speed: 0.05, desc: 'Travels to found a new settlement.' });
  def('hero', { name: 'Hero', icon: '🦸', kind: 'human', ai: 'hero', hp: 260, dmg: 30, speed: 0.07, atkCd: 12, aggroR: 18, desc: 'A legendary champion who hunts monsters.' });
  def('leader', { name: 'Leader', icon: '👑', kind: 'human', ai: 'leader', hp: 60, speed: 0.03, desc: 'Ruler of a civilization. Stays near the capital.' });
  def('wizard', { name: 'Wizard', icon: '🧙', kind: 'human', ai: 'wizard', hp: 80, dmg: 25, speed: 0.04, aggroR: 9, desc: 'Casts fireballs at monsters and heals allies.' });
  def('trader', { name: 'Trader', icon: '💰', kind: 'human', ai: 'trader', hp: 25, speed: 0.06, desc: 'Walks between civilizations carrying gold.' });
  def('prophet', { name: 'Prophet', icon: '🙏', kind: 'human', ai: 'prophet', hp: 60, speed: 0.035, sprite: 'wizard', recolor: { B: '#fff3b0' }, desc: 'Sanctifies ground and lifts spirits.' });
  def('druid', { name: 'Druid', icon: '🌿', kind: 'human', ai: 'druid', hp: 70, speed: 0.04, sprite: 'wizard', recolor: { B: '#2e7d32' }, desc: 'Restores nature wherever they walk.' });
  def('paladin', { name: 'Paladin', icon: '🛡️', kind: 'human', ai: 'hero', hp: 400, dmg: 40, speed: 0.06, aggroR: 20, sprite: 'hero', recolor: { R: '#ffd700' }, desc: 'Holy warrior. Monsters fear them.' });
  def('bandit', { name: 'Bandit', icon: '🗡️', kind: 'monster', ai: 'monster', hp: 35, dmg: 10, speed: 0.055, aggroR: 10, hostile: true, desc: 'Robs civilians and steals gold.' });
  def('assassin', { name: 'Assassin', icon: '🔪', kind: 'monster', ai: 'assassin', hp: 50, dmg: 200, speed: 0.08, aggroR: 60, hostile: true, sprite: 'bandit', recolor: { r: '#222' }, desc: 'Hunts down leaders.' });
  def('cultist', { name: 'Cultist', icon: '🕯️', kind: 'monster', ai: 'cultist', hp: 30, dmg: 6, speed: 0.04, hostile: true, desc: 'Spreads corruption wherever they go.' });
  def('nomad', { name: 'Nomad', icon: '🏕️', kind: 'human', ai: 'nomad', hp: 25, speed: 0.04, sprite: 'settler', desc: 'Roams the land, may settle one day.' });

  // ---------------- ANIMALS ----------------
  const herb = (key, o) => def(key, Object.assign({ kind: 'animal', ai: 'herb', breed: 0.0015, life: 6000 }, o));
  const pred = (key, o) => def(key, Object.assign({ kind: 'animal', ai: 'pred', breed: 0.0006, life: 7000 }, o));
  herb('cow', { icon: '🐄', hp: 30, speed: 0.025, livestock: true, biomes: [T.GRASS, T.FLOWERS, T.SAVANNA] });
  herb('sheep', { icon: '🐑', hp: 20, speed: 0.03, livestock: true, biomes: [T.GRASS, T.HILLS, T.TUNDRA] });
  herb('pig', { icon: '🐖', hp: 25, speed: 0.03, livestock: true, biomes: [T.GRASS, T.FOREST, T.MUD] });
  herb('chicken', { icon: '🐔', hp: 6, speed: 0.035, livestock: true, breed: 0.003, biomes: [T.GRASS, T.FARM, T.SAVANNA] });
  herb('horse', { icon: '🐎', hp: 40, speed: 0.08, livestock: true, biomes: [T.GRASS, T.SAVANNA] });
  herb('goat', { icon: '🐐', hp: 20, speed: 0.045, livestock: true, biomes: [T.HILLS, T.MOUNTAIN, T.TUNDRA] });
  herb('deer', { icon: '🦌', hp: 25, speed: 0.07, biomes: [T.FOREST, T.GRASS, T.JUNGLE] });
  herb('rabbit', { icon: '🐇', hp: 5, speed: 0.08, breed: 0.004, life: 3000, biomes: [T.GRASS, T.FOREST, T.FLOWERS] });
  herb('boar', { icon: '🐗', hp: 45, dmg: 8, speed: 0.05, biomes: [T.FOREST, T.JUNGLE, T.SWAMP] });
  herb('camel', { icon: '🐫', hp: 40, speed: 0.035, livestock: true, biomes: [T.DESERT, T.SAND, T.REDSAND] });
  herb('elephant', { icon: '🐘', hp: 160, dmg: 20, speed: 0.03, scale: 1.4, breed: 0.0004, biomes: [T.SAVANNA, T.JUNGLE] });
  herb('zebra', { icon: '🦓', hp: 35, speed: 0.07, biomes: [T.SAVANNA] });
  herb('giraffe', { icon: '🦒', hp: 60, speed: 0.045, scale: 1.3, biomes: [T.SAVANNA] });
  herb('monkey', { icon: '🐒', hp: 15, speed: 0.06, biomes: [T.JUNGLE] });
  herb('penguin', { icon: '🐧', hp: 12, speed: 0.03, habitat: 'amph', biomes: [T.SNOW, T.ICE, T.FROZEN] });
  herb('turtle', { icon: '🐢', hp: 40, speed: 0.012, habitat: 'amph', life: 20000, biomes: [T.SAND, T.SHALLOW] });
  herb('frog', { icon: '🐸', hp: 5, speed: 0.04, habitat: 'amph', breed: 0.003, life: 3000, biomes: [T.SWAMP, T.SHALLOW] });
  herb('butterfly', { icon: '🦋', hp: 1, speed: 0.03, habitat: 'air', life: 1500, breed: 0.001, biomes: [T.FLOWERS, T.GRASS] });
  herb('bird', { icon: '🐦', hp: 3, speed: 0.09, habitat: 'air', ai: 'fly', life: 4000, biomes: [T.FOREST, T.GRASS, T.JUNGLE] });
  herb('duck', { icon: '🦆', hp: 6, speed: 0.03, habitat: 'amph', biomes: [T.SHALLOW, T.SWAMP] });
  herb('dodo', { icon: '🦤', hp: 10, speed: 0.02, breed: 0.0005, biomes: [T.SAND, T.JUNGLE] });
  herb('mammoth', { icon: '🦣', hp: 220, dmg: 25, speed: 0.025, scale: 1.5, breed: 0.0003, life: 12000, biomes: [T.TUNDRA, T.SNOW] });
  herb('kangaroo', { icon: '🦘', hp: 30, speed: 0.075, biomes: [T.SAVANNA, T.DESERT] });
  herb('panda', { icon: '🐼', hp: 50, speed: 0.025, breed: 0.0003, biomes: [T.FOREST, T.JUNGLE] });
  herb('hippo', { icon: '🦛', hp: 180, dmg: 30, speed: 0.03, habitat: 'amph', scale: 1.3, biomes: [T.SWAMP, T.SHALLOW] });
  herb('yak', { icon: '🐃', hp: 70, speed: 0.03, livestock: true, sprite: 'cow', recolor: { W: '#5a3a1a' }, biomes: [T.TUNDRA, T.HILLS] });
  herb('llama', { icon: '🦙', hp: 30, speed: 0.04, livestock: true, sprite: 'camel', recolor: { A: '#f5f0e0' }, biomes: [T.HILLS, T.MOUNTAIN] });
  herb('reindeer', { icon: '🦌', hp: 30, speed: 0.06, sprite: 'deer', recolor: { A: '#a08060' }, biomes: [T.TUNDRA, T.SNOW] });
  herb('capybara', { icon: '🦫', hp: 25, speed: 0.025, habitat: 'amph', sprite: 'pig', recolor: { P: '#a0784c', F: '#a0784c' }, biomes: [T.SWAMP, T.GRASS, T.JUNGLE] });
  herb('hedgehog', { icon: '🦔', hp: 6, speed: 0.025, sprite: 'rat', recolor: { g: '#6b4f2e', P: '#333' }, biomes: [T.FOREST, T.GRASS] });
  herb('peacock', { icon: '🦚', hp: 8, speed: 0.03, sprite: 'chicken', recolor: { W: '#1f8fff', R: '#2fd0a0', O: '#2fd0a0' }, biomes: [T.JUNGLE, T.FLOWERS] });
  herb('flamingo', { icon: '🦩', hp: 8, speed: 0.035, habitat: 'amph', sprite: 'chicken', recolor: { W: '#ff7fb0', R: '#ff7fb0' }, biomes: [T.SWAMP, T.SHALLOW] });
  herb('fish', { icon: '🐟', hp: 4, speed: 0.04, habitat: 'water', ai: 'swim', breed: 0.003, life: 3000, biomes: [T.WATER, T.SHALLOW, T.REEF] });
  herb('salmon', { icon: '🐠', hp: 5, speed: 0.05, habitat: 'water', ai: 'swim', breed: 0.0025, life: 3000, sprite: 'fish', recolor: { B: '#ff7f50', L: '#ffb090' }, biomes: [T.WATER, T.SHALLOW] });
  herb('jellyfish', { icon: '🪼', hp: 3, dmg: 3, speed: 0.01, habitat: 'water', ai: 'swim', life: 4000, sprite: 'octopus', recolor: { p: '#ffb3ec' }, biomes: [T.WATER, T.DEEP] });
  herb('whale', { icon: '🐋', hp: 400, speed: 0.03, habitat: 'water', ai: 'swim', scale: 1.6, breed: 0.0002, life: 30000, biomes: [T.DEEP, T.WATER] });
  herb('dolphin', { icon: '🐬', hp: 40, speed: 0.08, habitat: 'water', ai: 'swim', life: 10000, biomes: [T.WATER, T.SHALLOW] });
  herb('octopus', { icon: '🐙', hp: 20, speed: 0.03, habitat: 'water', ai: 'swim', biomes: [T.WATER, T.REEF] });
  herb('crab', { icon: '🦀', hp: 8, speed: 0.02, habitat: 'amph', biomes: [T.SAND, T.SHALLOW] });
  herb('squid', { icon: '🦑', hp: 25, speed: 0.04, habitat: 'water', ai: 'swim', sprite: 'octopus', recolor: { p: '#ff6f6f' }, biomes: [T.DEEP] });
  herb('bee', { icon: '🐝', hp: 1, dmg: 1, speed: 0.05, habitat: 'air', ai: 'bee', life: 2000, breed: 0.002, biomes: [T.FLOWERS] });
  herb('rat', { icon: '🐀', hp: 4, speed: 0.05, breed: 0.004, life: 2000, biomes: [T.RUINS, T.SWAMP, T.GRASS] });
  pred('wolf', { icon: '🐺', hp: 45, dmg: 10, speed: 0.07, prey: ['deer', 'sheep', 'rabbit', 'goat', 'reindeer', 'human'], biomes: [T.FOREST, T.TUNDRA, T.HILLS] });
  pred('bear', { icon: '🐻', hp: 120, dmg: 20, speed: 0.05, prey: ['deer', 'boar', 'fish', 'human', 'salmon'], biomes: [T.FOREST, T.HILLS] });
  pred('polar_bear', { icon: '🐻‍❄️', hp: 140, dmg: 22, speed: 0.045, habitat: 'amph', sprite: 'bear', recolor: { T: '#f4f8ff' }, prey: ['penguin', 'fish', 'human'], biomes: [T.SNOW, T.ICE, T.FROZEN] });
  pred('fox', { icon: '🦊', hp: 20, dmg: 6, speed: 0.075, prey: ['rabbit', 'chicken', 'rat', 'duck'], biomes: [T.FOREST, T.GRASS] });
  pred('lion', { icon: '🦁', hp: 110, dmg: 22, speed: 0.07, prey: ['zebra', 'deer', 'giraffe', 'kangaroo', 'human'], biomes: [T.SAVANNA] });
  pred('tiger', { icon: '🐅', hp: 120, dmg: 24, speed: 0.075, prey: ['deer', 'monkey', 'boar', 'human'], biomes: [T.JUNGLE] });
  pred('crocodile', { icon: '🐊', hp: 100, dmg: 25, speed: 0.035, habitat: 'amph', prey: ['zebra', 'deer', 'fish', 'frog', 'human', 'capybara'], biomes: [T.SWAMP, T.SHALLOW] });
  pred('snake', { icon: '🐍', hp: 10, dmg: 12, speed: 0.04, prey: ['rat', 'rabbit', 'frog', 'chicken'], biomes: [T.SAVANNA, T.DESERT, T.JUNGLE] });
  pred('scorpion', { icon: '🦂', hp: 8, dmg: 8, speed: 0.03, prey: ['rat'], biomes: [T.DESERT, T.REDSAND] });
  pred('eagle', { icon: '🦅', hp: 15, dmg: 8, speed: 0.1, habitat: 'air', ai: 'fly', prey: ['rabbit', 'fish', 'rat', 'snake'], sprite: 'bird', recolor: { K: '#6b4f2e' }, biomes: [T.MOUNTAIN, T.HILLS] });
  pred('owl', { icon: '🦉', hp: 10, dmg: 5, speed: 0.07, habitat: 'air', ai: 'fly', prey: ['rat', 'rabbit'], sprite: 'bird', recolor: { K: '#a08060' }, biomes: [T.FOREST] });
  pred('shark', { icon: '🦈', hp: 90, dmg: 25, speed: 0.07, habitat: 'water', ai: 'swim', prey: ['fish', 'salmon', 'dolphin', 'turtle', 'duck', 'human'], biomes: [T.WATER, T.DEEP] });
  pred('cat', { icon: '🐈', hp: 12, dmg: 5, speed: 0.06, prey: ['rat', 'bird', 'butterfly'], breed: 0.0012, biomes: [T.GRASS] });
  pred('dog', { icon: '🐕', hp: 25, dmg: 8, speed: 0.065, prey: ['rabbit', 'rat', 'zombie', 'skeleton'], breed: 0.001, biomes: [T.GRASS] });
  pred('spider', { icon: '🕷️', hp: 6, dmg: 4, speed: 0.045, prey: ['bee', 'butterfly', 'rat'], scale: 0.6, biomes: [T.FOREST, T.CAVE] });
  pred('bat', { icon: '🦇', hp: 4, dmg: 1, speed: 0.08, habitat: 'air', ai: 'fly', prey: ['butterfly', 'bee'], sprite: 'bird', recolor: { K: '#333' }, biomes: [T.CAVE, T.MOUNTAIN] });

  // ---------------- MONSTERS ----------------
  const mon = (key, o) => def(key, Object.assign({ kind: 'monster', ai: 'monster', hostile: true, life: 0, aggroR: 14 }, o));
  mon('zombie', { icon: '🧟', hp: 40, dmg: 8, speed: 0.03, infect: true, desc: 'Slow, relentless, and contagious.' });
  mon('skeleton', { icon: '💀', hp: 30, dmg: 10, speed: 0.04, desc: 'Rattling bones with a grudge.' });
  mon('slime', { icon: '🟢', hp: 25, dmg: 4, speed: 0.025, split: true, desc: 'Splits when struck.' });
  mon('giant', { icon: '🗿', hp: 500, dmg: 60, speed: 0.03, scale: 1.2, atkCd: 30, crush: true, desc: 'Crushes buildings underfoot.' });
  mon('troll', { icon: '👹', hp: 300, dmg: 35, speed: 0.035, sprite: 'giant', recolor: { S: '#6b8e23', T: '#4a5d23' }, regen: 1, desc: 'Regenerates. Hates sunlight.' });
  mon('orc', { icon: '👺', hp: 70, dmg: 14, speed: 0.045, sprite: 'soldier', recolor: { S: '#5b8c3a', C: '#4a3a2a', G: '#333' }, desc: 'Raids settlements in packs.' });
  mon('goblin', { icon: '👾', hp: 20, dmg: 6, speed: 0.06, sprite: 'imp', recolor: { R: '#4caf50' }, steal: true, desc: 'Steals gold and runs.' });
  mon('ogre', { icon: '🧌', hp: 400, dmg: 45, speed: 0.03, sprite: 'giant', recolor: { S: '#c9a06b', T: '#7a5a2a' }, crush: true });
  mon('werewolf', { icon: '🐺', hp: 120, dmg: 25, speed: 0.08, sprite: 'wolf', recolor: { G: '#3a2a1a' }, nocturnal: true, desc: 'Fierce at night, docile by day.' });
  mon('vampire', { icon: '🧛', hp: 150, dmg: 30, speed: 0.06, nocturnal: true, infectType: 'vampire', infectChance: 0.15, desc: 'Drains the living. Burns in daylight.' });
  mon('mummy', { icon: '🧟‍♂️', hp: 90, dmg: 15, speed: 0.025, desc: 'Ancient curse wrapped in linen.' });
  mon('yeti', { icon: '🦍', hp: 250, dmg: 35, speed: 0.045, fireproof: false, desc: 'Abominable mountain dweller.' });
  mon('rock_golem', { icon: '🪨', hp: 600, dmg: 40, speed: 0.02, sprite: 'golem', crush: true, fireproof: true, desc: 'Living stone. Immune to fire.' });
  mon('demon', { icon: '😈', hp: 350, dmg: 40, speed: 0.05, fireproof: true, ignites: true, desc: 'Leaves fire in its wake.' });
  mon('imp', { icon: '👿', hp: 20, dmg: 6, speed: 0.07, fireproof: true, ignites: true, scale: 0.7 });
  mon('minotaur', { icon: '🐂', hp: 400, dmg: 50, speed: 0.055, sprite: 'giant', recolor: { S: '#8b5a2b', T: '#4a2a1a' } });
  mon('cyclops', { icon: '👁️', hp: 700, dmg: 70, speed: 0.03, sprite: 'giant', recolor: { S: '#d9a066' }, crush: true, scale: 1.4 });
  mon('harpy', { icon: '🦅', hp: 60, dmg: 15, speed: 0.09, habitat: 'air', ai: 'flyer', sprite: 'griffin', recolor: { Y: '#8b5a2b', T: '#f1c27d' } });
  mon('wyvern', { icon: '🐉', hp: 300, dmg: 30, speed: 0.1, habitat: 'air', ai: 'flyer', sprite: 'dragon', recolor: { R: '#2e8b57' }, scale: 0.7, fireproof: true, breath: 'fire' });
  mon('dragon', { icon: '🐲', hp: 900, dmg: 60, speed: 0.1, habitat: 'air', ai: 'flyer', scale: 1.5, fireproof: true, breath: 'fire', boss: true, desc: 'Burns cities to the ground.' });
  mon('ice_dragon', { icon: '❄️', hp: 900, dmg: 50, speed: 0.1, habitat: 'air', ai: 'flyer', sprite: 'dragon', recolor: { R: '#a0e9ff', Y: '#fff' }, scale: 1.5, breath: 'ice', boss: true });
  mon('void_dragon', { icon: '🌌', hp: 1500, dmg: 90, speed: 0.11, habitat: 'air', ai: 'flyer', sprite: 'dragon', recolor: { R: '#2a0a3a', Y: '#ff00ff' }, scale: 1.8, breath: 'void', boss: true, fireproof: true });
  mon('kraken', { icon: '🦑', hp: 1500, dmg: 80, speed: 0.04, habitat: 'water', ai: 'seamonster', scale: 1.8, boss: true, desc: 'Terror of the deep. Smashes ports and ships.' });
  mon('sea_serpent', { icon: '🐍', hp: 500, dmg: 40, speed: 0.07, habitat: 'water', ai: 'seamonster', sprite: 'snake', recolor: { N: '#1f6a7a' }, scale: 1.6 });
  mon('leviathan', { icon: '🐋', hp: 3000, dmg: 120, speed: 0.035, habitat: 'water', ai: 'seamonster', sprite: 'whale', recolor: { b: '#0a0a2a' }, scale: 2.5, boss: true });
  mon('megalodon', { icon: '🦈', hp: 800, dmg: 70, speed: 0.08, habitat: 'water', ai: 'swim', sprite: 'shark', recolor: { G: '#444' }, scale: 2, prey: ['whale', 'shark', 'dolphin', 'fish', 'human'] });
  mon('kaiju', { icon: '🦖', hp: 4000, dmg: 150, speed: 0.03, ai: 'kaiju', habitat: 'amph', scale: 2, boss: true, fireproof: true, desc: 'A walking apocalypse.' });
  mon('mecha_kaiju', { icon: '🤖', hp: 6000, dmg: 200, speed: 0.035, ai: 'kaiju', habitat: 'amph', sprite: 'kaiju', recolor: { n: '#777', Y: '#ff0000' }, scale: 2.2, boss: true, fireproof: true });
  mon('ghost', { icon: '👻', hp: 60, dmg: 3, speed: 0.04, habitat: 'air', ai: 'ghost', ethereal: true, life: 3000, desc: 'Only holy power can banish it.' });
  mon('banshee', { icon: '😱', hp: 80, dmg: 5, speed: 0.05, habitat: 'air', ai: 'ghost', sprite: 'ghost', recolor: { W: '#c8f0ff' }, ethereal: true, scream: true, life: 3000 });
  mon('wraith', { icon: '🌑', hp: 120, dmg: 18, speed: 0.06, habitat: 'air', ai: 'ghost', sprite: 'ghost', recolor: { W: '#333', K: '#f00' }, ethereal: true, life: 4000 });
  mon('lich', { icon: '☠️', hp: 400, dmg: 35, speed: 0.03, ai: 'necromancer', sprite: 'wizard', recolor: { B: '#222', S: '#ccc' }, desc: 'Raises skeletons from the earth.' });
  mon('necromancer', { icon: '🧙‍♂️', hp: 150, dmg: 20, speed: 0.035, ai: 'necromancer', sprite: 'wizard', recolor: { B: '#4a0a4a' } });
  mon('witch', { icon: '🧙‍♀️', hp: 120, dmg: 15, speed: 0.04, ai: 'witch', desc: 'Turns people into frogs. Rude.' });
  mon('giant_spider', { icon: '🕷️', hp: 150, dmg: 25, speed: 0.06, sprite: 'spider', scale: 1.5 });
  mon('giant_scorpion', { icon: '🦂', hp: 200, dmg: 30, speed: 0.045, sprite: 'scorpion', scale: 2 });
  mon('hydra', { icon: '🐉', hp: 1200, dmg: 60, speed: 0.035, habitat: 'amph', regen: 3, scale: 1.6, boss: true });
  mon('cerberus', { icon: '🐕', hp: 500, dmg: 45, speed: 0.08, sprite: 'dog', recolor: { T: '#2a0a0a' }, scale: 1.5, fireproof: true, ignites: true });
  mon('hellhound', { icon: '🔥', hp: 90, dmg: 18, speed: 0.09, sprite: 'wolf', recolor: { G: '#ff4500' }, fireproof: true, ignites: true });
  mon('shadow', { icon: '🌚', hp: 70, dmg: 15, speed: 0.07, sprite: 'human', recolor: { S: '#000', C: '#000', K: '#000' }, nocturnal: true, ethereal: true });
  mon('gargoyle', { icon: '🗿', hp: 300, dmg: 30, speed: 0.06, habitat: 'air', ai: 'flyer', sprite: 'griffin', recolor: { Y: '#777', T: '#555', O: '#777' }, fireproof: true });
  mon('abomination', { icon: '🧬', hp: 250, dmg: 30, speed: 0.04, sprite: 'slime', recolor: { N: '#8b008b', K: '#ff0' }, scale: 1.4, regen: 1 });
  mon('mutant_cow', { icon: '🐮', hp: 80, dmg: 15, speed: 0.045, sprite: 'cow', recolor: { W: '#9acd32', K: '#ff0' } });
  mon('zombie_cow', { icon: '🐄', hp: 60, dmg: 8, speed: 0.025, sprite: 'cow', recolor: { W: '#4caf50' }, infect: true });
  mon('zombie_chicken', { icon: '🐔', hp: 12, dmg: 4, speed: 0.04, sprite: 'chicken', recolor: { W: '#4caf50' }, infect: true, scale: 0.9 });
  mon('alien', { icon: '👽', hp: 60, dmg: 20, speed: 0.05, range: 4, ranged: 'laser', desc: 'Shoots lasers. Not here to make friends.' });
  mon('alien_brute', { icon: '👾', hp: 400, dmg: 50, speed: 0.04, sprite: 'alien', scale: 1.6, crush: true });
  mon('rogue_robot', { icon: '🤖', hp: 120, dmg: 25, speed: 0.045, sprite: 'robot', range: 3, ranged: 'laser', fireproof: true });
  mon('terminator', { icon: '🦾', hp: 600, dmg: 60, speed: 0.06, sprite: 'robot', recolor: { G: '#444', R: '#f00' }, range: 4, ranged: 'laser', fireproof: true, regen: 1 });
  mon('grey_goo', { icon: '🫧', hp: 40, dmg: 10, speed: 0.02, ai: 'goo', sprite: 'goo', desc: 'Converts everything into more goo.' });
  mon('plague_rat', { icon: '🐀', hp: 6, dmg: 1, speed: 0.06, ai: 'rat', sprite: 'rat', recolor: { g: '#3a5a2a' }, desc: 'Carries plague to the nearest town.' });
  mon('locust_swarm', { icon: '🦗', hp: 30, dmg: 0, speed: 0.06, habitat: 'air', ai: 'locust', sprite: 'bee', recolor: { Y: '#9acd32', K: '#556b2f' }, scale: 1.6, life: 1500, desc: 'Devours farmland.' });
  mon('wasp_swarm', { icon: '🐝', hp: 25, dmg: 3, speed: 0.07, habitat: 'air', ai: 'flyer', sprite: 'bee', recolor: { Y: '#ff8c00' }, scale: 1.4, life: 1500 });
  mon('gremlin', { icon: '👹', hp: 25, dmg: 5, speed: 0.07, sprite: 'imp', recolor: { R: '#2e8b57', K: '#ff0' }, sabotage: true, desc: 'Wrecks machines and buildings.' });
  mon('doom_bringer', { icon: '💀', hp: 2000, dmg: 100, speed: 0.025, sprite: 'reaper', recolor: { W: '#f00' }, scale: 1.8, wasteTrail: true, boss: true, fireproof: true });
  mon('slime_king', { icon: '👑', hp: 600, dmg: 20, speed: 0.025, sprite: 'slime', recolor: { K: '#ffd700' }, scale: 2.2, split: true, boss: true });
  mon('basilisk', { icon: '🦎', hp: 350, dmg: 45, speed: 0.045, sprite: 'crocodile', recolor: { n: '#556b2f', K: '#f00' }, scale: 1.3 });
  mon('chaos_spawn', { icon: '🌀', hp: 200, dmg: 25, speed: 0.06, sprite: 'eye', recolor: { B: '#ff00ff' }, chaos: true });
  mon('pirate_ship', { icon: '🏴‍☠️', hp: 300, dmg: 30, speed: 0.045, habitat: 'water', ai: 'pirate', sprite: 'pirate', range: 4, ranged: 'cannon', desc: 'Raids coasts and steals gold.' });
  mon('raider', { icon: '🪓', hp: 50, dmg: 14, speed: 0.055, sprite: 'soldier', recolor: { C: '#5a1a1a', G: '#333' } });
  mon('evil_snowman', { icon: '⛄', hp: 80, dmg: 12, speed: 0.03, sprite: 'snowman', recolor: { K: '#f00' }, melts: true });
  mon('fire_elemental', { icon: '🔥', hp: 200, dmg: 25, speed: 0.05, ai: 'elemental', sprite: 'human', recolor: { S: '#ffd93d', C: '#ff4500', K: '#ff8c00' }, fireproof: true, element: 'fire' });
  mon('mind_flayer', { icon: '🧠', hp: 250, dmg: 20, speed: 0.04, sprite: 'octopus', recolor: { p: '#9370db' }, habitat: 'land', mindControl: true, desc: 'Turns soldiers against their own.' });
  mon('bandit_camp', { icon: '⛺', hp: 200, dmg: 0, speed: 0, ai: 'spawner', sprite: 'campfire', spawnType: 'bandit', spawnEvery: 400, spawnMax: 5, desc: 'Spawns bandits.' });
  mon('demon_portal', { icon: '🌀', hp: 400, dmg: 0, speed: 0, ai: 'spawner', sprite: 'portal', recolor: { V: '#ff3b00' }, spawnType: 'imp', spawnEvery: 200, spawnMax: 10, fireproof: true });
  mon('zombie_nest', { icon: '🪦', hp: 150, dmg: 0, speed: 0, ai: 'spawner', sprite: 'sign', recolor: { T: '#444' }, spawnType: 'zombie', spawnEvery: 300, spawnMax: 8 });
  mon('alien_mothership', { icon: '🛸', hp: 2500, dmg: 50, speed: 0.02, habitat: 'air', ai: 'spawner', sprite: 'ufo', scale: 3, spawnType: 'alien', spawnEvery: 250, spawnMax: 12, moves: true, boss: true });
  mon('hive', { icon: '🐝', hp: 200, dmg: 0, speed: 0, ai: 'spawner', sprite: 'egg', recolor: { O: '#ff8c00', Y: '#333' }, spawnType: 'wasp_swarm', spawnEvery: 500, spawnMax: 4 });

  // ---------------- MYTHIC / GOOD ----------------
  const myth = (key, o) => def(key, Object.assign({ kind: 'mythic', ai: 'healer' }, o));
  myth('unicorn', { icon: '🦄', hp: 200, dmg: 20, speed: 0.06, healR: 4, flowers: true, desc: 'Heals the wounded, grows flowers.' });
  myth('fairy', { icon: '🧚', hp: 15, speed: 0.05, habitat: 'air', healR: 2, flowers: true, life: 6000, scale: 0.8 });
  myth('angel', { icon: '👼', hp: 300, dmg: 40, speed: 0.08, habitat: 'air', ai: 'guardian', aggroR: 16, healR: 4, holy: true, desc: 'Smites monsters and heals the faithful.' });
  myth('archangel', { icon: '✨', hp: 900, dmg: 90, speed: 0.09, habitat: 'air', ai: 'guardian', aggroR: 25, healR: 6, holy: true, sprite: 'angel', recolor: { W: '#ffd700' }, scale: 1.5 });
  myth('phoenix', { icon: '🔥', hp: 400, dmg: 35, speed: 0.1, habitat: 'air', ai: 'guardian', aggroR: 20, fireproof: true, rebirth: true, desc: 'Burns monsters; reborn from ashes.' });
  myth('treant', { icon: '🌳', hp: 500, dmg: 35, speed: 0.02, ai: 'planter', aggroR: 8, plant: T.FOREST, desc: 'Walks slowly and plants forests.' });
  myth('dryad', { icon: '🌸', hp: 80, speed: 0.04, ai: 'planter', sprite: 'fairy', recolor: { L: '#4caf50', P: '#ff9ecf' }, plant: T.FLOWERS });
  myth('golem_guardian', { icon: '🗿', hp: 800, dmg: 50, speed: 0.03, ai: 'guardian', aggroR: 12, sprite: 'golem', recolor: { G: '#8fbc8f' }, fireproof: true, desc: 'Protects the nearest town.' });
  myth('griffin', { icon: '🦅', hp: 350, dmg: 45, speed: 0.1, habitat: 'air', ai: 'guardian', aggroR: 20 });
  myth('pegasus', { icon: '🐎', hp: 150, speed: 0.1, habitat: 'air', ai: 'fly', healR: 0 });
  myth('kirin', { icon: '🦌', hp: 300, dmg: 30, speed: 0.08, ai: 'healer', sprite: 'unicorn', recolor: { W: '#ffd700', P: '#ff6f00' }, healR: 5, blessTiles: true });
  myth('sphinx', { icon: '🦁', hp: 600, dmg: 40, speed: 0.02, ai: 'sage', sprite: 'lion', recolor: { O: '#d4a017' }, scale: 1.5, gives: 'science' });
  myth('muse', { icon: '🎭', hp: 50, speed: 0.04, habitat: 'air', ai: 'sage', sprite: 'fairy', recolor: { L: '#ff69b4', P: '#fff' }, gives: 'culture' });
  myth('saint', { icon: '😇', hp: 100, speed: 0.035, ai: 'prophet', sprite: 'angel', recolor: { W: '#f5f5dc' } });
  myth('genie', { icon: '🧞', hp: 200, speed: 0.08, habitat: 'air', ai: 'genie', desc: 'Grants a wish to the first town it reaches.' });
  myth('cupid', { icon: '💘', hp: 50, speed: 0.07, habitat: 'air', ai: 'cupid', desc: 'Makes civilizations love each other.' });
  myth('santa', { icon: '🎅', hp: 500, speed: 0.1, habitat: 'air', ai: 'santa', desc: 'Delivers gold and joy to every town.' });
  myth('leprechaun', { icon: '🍀', hp: 30, speed: 0.07, ai: 'leprechaun', sprite: 'imp', recolor: { R: '#2e8b57', K: '#ff8c00' }, desc: 'Leaves gold wherever it goes.' });
  myth('water_elemental', { icon: '💧', hp: 250, dmg: 15, speed: 0.045, habitat: 'amph', ai: 'elemental', sprite: 'human', recolor: { S: '#a0e9ff', C: '#3a86ff', K: '#1d3f8f' }, element: 'water' });
  myth('earth_elemental', { icon: '🪨', hp: 500, dmg: 30, speed: 0.02, ai: 'elemental', sprite: 'golem', recolor: { G: '#8b5a2b' }, element: 'earth' });
  myth('air_elemental', { icon: '💨', hp: 150, dmg: 10, speed: 0.09, habitat: 'air', ai: 'elemental', sprite: 'ghost', recolor: { W: '#e0ffff' }, element: 'air' });
  myth('snowman', { icon: '⛄', hp: 40, speed: 0.01, ai: 'wander', melts: true, desc: 'Melts in the heat.' });
  myth('gingerbread', { icon: '🍪', hp: 10, speed: 0.03, ai: 'herb', breed: 0.001, life: 4000, kind: 'animal', livestock: true });
  myth('rubber_duck', { icon: '🦆', hp: 999, speed: 0.01, habitat: 'water', ai: 'swim', sprite: 'duck', immortal: true, desc: 'Indestructible. Comforting.' });
  myth('spirit_wolf', { icon: '🐺', hp: 200, dmg: 25, speed: 0.09, ai: 'guardian', sprite: 'wolf', recolor: { G: '#b0e0ff' }, aggroR: 15 });
  myth('ent', { icon: '🌲', hp: 1200, dmg: 60, speed: 0.015, ai: 'planter', sprite: 'treant', scale: 1.8, plant: T.FOREST, aggroR: 10 });
  myth('myconid', { icon: '🍄', hp: 60, speed: 0.025, ai: 'planter', sprite: 'slime', recolor: { N: '#c58ad8', K: '#fff' }, plant: T.MUSHROOM });
  myth('nymph', { icon: '🧜', hp: 80, speed: 0.05, habitat: 'water', ai: 'cleanser', sprite: 'fairy', recolor: { L: '#3a86ff', P: '#a0e9ff' } });
  myth('reaper', { icon: '⚰️', hp: 999, dmg: 999, speed: 0.045, habitat: 'air', ai: 'reaper', kind: 'monster', hostile: true, life: 1500, immortal: true, desc: 'Takes one soul at a time.' });
  myth('yeti_friend', { icon: '🦍', hp: 300, dmg: 30, speed: 0.04, ai: 'guardian', sprite: 'yeti', aggroR: 10 });
  myth('capy_god', { icon: '🦫', hp: 5000, speed: 0.02, ai: 'healer', sprite: 'pig', recolor: { P: '#a0784c', F: '#a0784c' }, scale: 3, healR: 8, calm: true, immortal: true, desc: 'All creatures near it are at peace.' });

  // ---------------- SPECIAL / TECH / OBJECTS ----------------
  const sp = (key, o) => def(key, Object.assign({ kind: 'special', hp: 1000, immortal: true, habitat: 'air' }, o));
  sp('tornado', { icon: '🌪️', ai: 'tornado', speed: 0.07, life: 700, r: 2.2, desc: 'Flings creatures, wrecks buildings.' });
  sp('fire_tornado', { icon: '🔥', ai: 'tornado', speed: 0.065, life: 600, r: 2, fire: true });
  sp('sharknado', { icon: '🦈', ai: 'tornado', speed: 0.07, life: 700, r: 2.5, sharks: true });
  sp('mega_tornado', { icon: '🌪️', ai: 'tornado', speed: 0.05, life: 1200, r: 4.5 });
  sp('cloud', { icon: '🌧️', ai: 'cloud', speed: 0.01, life: 900, r: 6, cloudType: 'rain', desc: 'Rains inside its radius.' });
  sp('meteor', { icon: '☄️', ai: 'meteor', speed: 0.6, life: 0, power: 4 });
  sp('bomb', { icon: '💣', ai: 'bomb', habitat: 'any', speed: 0, fuse: 60, power: 3 });
  sp('missile', { icon: '🚀', ai: 'missile', speed: 0.45, power: 4 });
  sp('blackhole', { icon: '🕳️', ai: 'blackhole', speed: 0.005, life: 600, r: 1.5 });
  sp('portal', { icon: '🌀', ai: 'portal', speed: 0, life: 6000, habitat: 'any' });
  sp('shield', { icon: '🛡️', ai: 'shield', speed: 0, life: 1500, r: 6 });
  sp('ufo', { icon: '🛸', ai: 'ufo', speed: 0.06, life: 2500, hp: 300, immortal: false, kind: 'monster', hostile: true, desc: 'Abducts cows and people.' });
  sp('robot', { icon: '🤖', ai: 'guardian', habitat: 'land', speed: 0.045, hp: 150, dmg: 25, immortal: false, kind: 'mythic', aggroR: 12, fireproof: true, range: 3, ranged: 'laser' });
  sp('mech', { icon: '🦾', ai: 'guardian', habitat: 'land', speed: 0.035, hp: 1200, dmg: 80, immortal: false, kind: 'mythic', aggroR: 15, fireproof: true, scale: 1.5, range: 5, ranged: 'laser' });
  sp('turret', { icon: '🔫', ai: 'turret', habitat: 'land', speed: 0, hp: 300, dmg: 35, immortal: false, kind: 'mythic', range: 8 });
  sp('drone', { icon: '🛩️', ai: 'guardian', speed: 0.1, hp: 60, dmg: 15, immortal: false, kind: 'mythic', aggroR: 14, sprite: 'bird', recolor: { K: '#aaa' }, range: 4, ranged: 'laser' });
  sp('nanobots', { icon: '🧫', ai: 'nanobots', speed: 0.03, life: 1500, hp: 50, immortal: false, kind: 'mythic', sprite: 'goo', recolor: { G: '#a0e9ff', Z: '#fff' } });
  sp('boat', { icon: '⛵', ai: 'boat', habitat: 'water', speed: 0.06, hp: 80, immortal: false, kind: 'human' });
  sp('warship', { icon: '🚢', ai: 'warship', habitat: 'water', speed: 0.05, hp: 250, dmg: 30, immortal: false, kind: 'human', range: 4, ranged: 'cannon' });
  sp('fishing_boat', { icon: '🎣', ai: 'fishing', habitat: 'water', speed: 0.04, hp: 60, immortal: false, kind: 'human', sprite: 'boat', life: 4000 });
  sp('balloon', { icon: '🎈', ai: 'balloon', speed: 0.02, life: 600 });
  sp('firework', { icon: '🎆', ai: 'firework', speed: 0.15, life: 50, sprite: 'rocket' });
  sp('rocket', { icon: '🚀', ai: 'rocket', speed: 0.05, life: 300 });
  sp('landmine', { icon: '💥', ai: 'mine', habitat: 'land', speed: 0, sprite: 'mine', power: 2, hp: 10, immortal: false });
  sp('totem', { icon: '🗿', ai: 'static', habitat: 'land', speed: 0, hp: 200, immortal: false, effect: 'repel', r: 7, desc: 'Monsters avoid it.' });
  sp('statue', { icon: '🗽', ai: 'static', habitat: 'land', speed: 0, hp: 300, immortal: false, effect: 'happy', r: 6 });
  sp('monolith', { icon: '⬛', ai: 'static', habitat: 'land', speed: 0, hp: 500, immortal: false, effect: 'science', r: 8 });
  sp('campfire', { icon: '🔥', ai: 'static', habitat: 'land', speed: 0, hp: 50, immortal: false, effect: 'camp', r: 5, life: 3000 });
  sp('lightning_rod', { icon: '⚡', ai: 'static', habitat: 'land', speed: 0, hp: 200, immortal: false, effect: 'rod', r: 10, sprite: 'rod' });
  sp('terraformer', { icon: '🌍', ai: 'static', habitat: 'land', speed: 0, hp: 400, immortal: false, effect: 'terraform', r: 5, sprite: 'machine' });
  sp('weather_machine', { icon: '🌦️', ai: 'static', habitat: 'land', speed: 0, hp: 400, immortal: false, effect: 'weather', r: 9, sprite: 'machine', recolor: { Z: '#a0e9ff' } });
  sp('well', { icon: '⛲', ai: 'static', habitat: 'land', speed: 0, hp: 200, immortal: false, effect: 'well', r: 4 });
  sp('scarecrow', { icon: '🎃', ai: 'static', habitat: 'land', speed: 0, hp: 30, immortal: false, effect: 'scare', r: 5 });
  sp('beacon', { icon: '📡', ai: 'static', habitat: 'land', speed: 0, hp: 200, immortal: false, effect: 'beacon', r: 12 });
  sp('forcefield_gen', { icon: '🔮', ai: 'static', habitat: 'land', speed: 0, hp: 500, immortal: false, effect: 'shield', r: 7, sprite: 'machine', recolor: { Z: '#c77dff' } });
  sp('sign', { icon: '🪧', ai: 'static', habitat: 'any', speed: 0, hp: 20, immortal: false, effect: 'none', r: 0 });
  sp('phoenix_egg', { icon: '🥚', ai: 'hatch', habitat: 'land', speed: 0, life: 500, hatch: 'phoenix', sprite: 'egg' });
  sp('dragon_egg', { icon: '🥚', ai: 'hatch', habitat: 'land', speed: 0, life: 900, hatch: 'dragon', sprite: 'egg', recolor: { O: '#8b1a1a', Y: '#ff3b00' } });
  sp('mystery_egg', { icon: '🥚', ai: 'hatch', habitat: 'land', speed: 0, life: 600, hatch: 'random', sprite: 'egg', recolor: { O: '#c77dff' } });
  sp('projectile', { icon: '➶', ai: 'projectile', habitat: 'air', speed: 0.5, noSave: true, sprite: 'generic' });
  sp('satellite', { icon: '🛰️', ai: 'orbit', speed: 0.08, life: 5000, sprite: 'ufo', recolor: { L: '#ddd', G: '#888', Y: '#3a86ff' }, scale: 0.7 });
  sp('gift', { icon: '🎁', ai: 'gift', habitat: 'land', speed: 0, life: 800, sprite: 'bomb', recolor: { K: '#e63946', O: '#ffd700' } });

  // ---------------- API ----------------
  function create(type, x, y, extra) {
    const d = DEFS[type];
    if (!d) return null;
    const e = {
      id: 0, type, def: d, kind: d.kind, x, y, vx: 0, vy: 0, hp: d.hp, maxHp: d.hp, age: 0,
      life: d.life ? Math.round(d.life * U.rfloat(0.75, 1.25)) : 0, civ: -1, role: null, habitat: d.habitat,
      speed: d.speed * U.rfloat(0.85, 1.15), dmg: d.dmg, timer: 0, cd: 0, tx: x, ty: y, hasTarget: false, blocked: 0,
      dead: false, flip: false, data: {}, scale: d.scale || 1, fireproof: !!d.fireproof, immortal: !!d.immortal,
      name: null, r: d.r || 0, flash: 0, noSave: !!d.noSave, target: 0, home: null,
    };
    if (extra) Object.assign(e, extra);
    if (e.r === undefined) e.r = d.r || 0;
    return e;
  }
  function spawn(world, type, x, y, extra) {
    if (!DEFS[type]) return null;
    const d = DEFS[type];
    if (world.entities.length > ENTITY_CAP && (d.kind === 'animal' || d.kind === 'monster') && !(extra && extra.force)) return null;
    x = U.clamp(x, 0.01, world.w - 0.01); y = U.clamp(y, 0.01, world.h - 0.01);
    const e = create(type, x, y, extra);
    if (!e) return null;
    if (e.kind === 'human' && !e.name) e.name = U.humanName();
    if (d.boss && !e.name) e.name = U.pick(['Gorthak', 'Vexmaw', 'Old Hollow', 'The Nameless', 'Ashfang', 'Umbra', 'Skarr', 'Nyxith', 'Grendlor', 'Morrgath']);
    world.addEntity(e);
    return e;
  }
  function spawnGroup(world, type, x, y, n, spread, extra) {
    const out = [];
    for (let k = 0; k < n; k++) {
      let px = x + U.rfloat(-spread, spread), py = y + U.rfloat(-spread, spread);
      const d = DEFS[type];
      if (!d) break;
      // find a standable spot near
      let ok = false;
      for (let t = 0; t < 8; t++) {
        if (canStandDef(world, d, px, py)) { ok = true; break; }
        px = x + U.rfloat(-spread, spread); py = y + U.rfloat(-spread, spread);
      }
      if (!ok && d.habitat !== 'air' && d.habitat !== 'any') { px = x; py = y; }
      const e = spawn(world, type, px, py, extra);
      if (e) out.push(e);
    }
    return out;
  }
  function canStandDef(world, d, x, y) {
    if (x < 0 || y < 0 || x >= world.w || y >= world.h) return false;
    const td = TILES[world.tiles[(y | 0) * world.w + (x | 0)]];
    switch (d.habitat) {
      case 'land': return td.land && td.walk;
      case 'water': return td.water;
      case 'amph': return (td.land && td.walk) || td.water;
      case 'air': return true;
      default: return td.walk || td.water;
    }
  }
  function canStand(world, e, x, y) {
    if (x < 0 || y < 0 || x >= world.w || y >= world.h) return false;
    const td = TILES[world.tiles[(y | 0) * world.w + (x | 0)]];
    if (e.def.ethereal) return true;
    switch (e.habitat) {
      case 'land': return td.land && td.walk;
      case 'water': return td.water;
      case 'amph': return (td.land && td.walk) || td.water;
      case 'air': return true;
      default: return td.walk || td.water;
    }
  }

  function damage(world, e, amt, cause, attacker) {
    if (e.dead || e.immortal) return false;
    if (world.isShielded && world.isShielded(e.x, e.y) && cause !== 'void') return false;
    if (e.def.ethereal && cause !== 'holy' && cause !== 'angel' && cause !== 'archangel' && cause !== 'paladin' && cause !== 'exorcism' && cause !== 'void') return false;
    if (e.armor) amt *= (1 - e.armor);
    e.hp -= amt;
    e.flash = 6;
    if (e.hp <= 0) { kill(world, e, cause, attacker); return true; }
    return false;
  }

  function kill(world, e, cause, attacker) {
    if (e.dead) return;
    e.dead = true;
    const d = e.def;
    if (MB.fx) {
      if (d.kind === 'human' || d.kind === 'animal') MB.fx.blood(e.x, e.y, d.kind === 'human' ? '#c1121f' : '#8b1a1a');
      else if (d.kind === 'monster') MB.fx.puff(e.x, e.y, '#7b2cbf', 6);
      else if (d.kind === 'mythic') MB.fx.sparkle(e.x, e.y, '#ffd700', 10);
    }
    // human death affects civ
    if (e.civ >= 0 && world.civs[e.civ]) {
      const civ = world.civs[e.civ];
      if (d.kind === 'human' && e.type !== 'boat' && e.type !== 'fishing_boat') {
        civ.pop = Math.max(0, civ.pop - (e.type === 'soldier' ? 1 : 2));
        civ.deaths = (civ.deaths || 0) + 1;
        if (cause && cause !== 'age') civ.fear = Math.min(100, (civ.fear || 0) + 1);
      }
      if (e.type === 'leader') MB.Civs.leaderDied(world, civ, cause);
      if (e.type === 'soldier') civ.soldiers = Math.max(0, (civ.soldiers || 0) - 1);
    }
    // infection
    if (attacker && attacker.def && d.kind === 'human' && e.type !== 'boat') {
      if (attacker.def.infect && Math.random() < 0.7) { const z = spawn(world, 'zombie', e.x, e.y, { force: true }); if (z) z.data.fresh = true; }
      else if (attacker.def.infectType && Math.random() < (attacker.def.infectChance || 0.2)) spawn(world, attacker.def.infectType, e.x, e.y, { force: true });
    }
    // slimes split
    if (d.split && cause !== 'age' && cause !== 'void' && e.maxHp > 8 && !e.data.nosplit) {
      for (let k = 0; k < 2; k++) {
        const s = spawn(world, e.type, e.x + U.rfloat(-0.6, 0.6), e.y + U.rfloat(-0.6, 0.6), { force: true });
        if (s) { s.hp = s.maxHp = Math.max(5, e.maxHp * 0.4); s.scale = e.scale * 0.7; s.dmg = e.dmg * 0.7; if (s.scale < 0.4) s.data.nosplit = true; }
      }
    }
    // phoenix rebirth
    if (d.rebirth && !e.data.noRebirth) {
      spawn(world, 'phoenix_egg', e.x, e.y);
      if (MB.fx) MB.fx.explosion(e.x, e.y, 2, '#ff8c00');
      world.forRadius(e.x, e.y, 2, (x, y, i) => { if (Math.random() < 0.5) world.ignite(i, 80); });
    }
    // loot for soldiers killing monsters
    if (attacker && attacker.civ >= 0 && d.kind === 'monster' && world.civs[attacker.civ]) {
      const c = world.civs[attacker.civ];
      c.gold += d.boss ? 200 : 5;
      c.happiness = Math.min(100, c.happiness + (d.boss ? 15 : 0.5));
      if (d.boss) world.addLog(`${c.name} slew the ${d.name} ${e.name || ''}!`, 'war', e.x, e.y);
    } else if (d.boss) {
      world.addLog(`The ${d.name} ${e.name ? e.name + ' ' : ''}has been destroyed.`, 'world', e.x, e.y);
    }
    if (cause === 'player') { world.playerStats.kills++; }
    if (e.type === 'boat' && e.data.passengers && e.civ >= 0 && world.civs[e.civ]) world.civs[e.civ].pop = Math.max(0, world.civs[e.civ].pop - e.data.passengers);
    if (e.type === 'blackhole' && e.onDie) e.onDie(world, e);
    if (MB.Civs && e.type === 'boat' && e.civ >= 0 && world.civs[e.civ]) world.civs[e.civ].boatsOut = Math.max(0, (world.civs[e.civ].boatsOut || 0) - 1);
  }

  function heal(e, amt) { if (e.dead) return; e.hp = Math.min(e.maxHp, e.hp + amt); }

  // choose animal type appropriate for the tile
  const BIOME_ANIMALS = {};
  for (const k in DEFS) {
    const d = DEFS[k];
    if (d.kind !== 'animal' || !d.biomes) continue;
    for (const b of d.biomes) { (BIOME_ANIMALS[b] = BIOME_ANIMALS[b] || []).push(k); }
  }
  function animalForTile(t) {
    const list = BIOME_ANIMALS[t];
    if (!list) return null;
    return U.pick(list);
  }
  function populateAnimals(world, n) {
    let placed = 0;
    for (let k = 0; k < n * 10 && placed < n; k++) {
      const x = U.rint(0, world.w - 1), y = U.rint(0, world.h - 1), i = y * world.w + x;
      const t = world.tiles[i];
      const type = animalForTile(t);
      if (!type) continue;
      if (world.owner[i] >= 0 && Math.random() < 0.7) continue;
      const d = DEFS[type];
      const cnt = type === 'whale' || type === 'elephant' || type === 'mammoth' || type === 'bear' || type === 'lion' || type === 'tiger' ? U.rint(1, 2) : U.rint(1, 4);
      spawnGroup(world, type, x + 0.5, y + 0.5, cnt, 1.5);
      placed += cnt;
      if (d.kind !== 'animal') break;
    }
  }

  function serialize(e) {
    const o = { t: e.type, x: Math.round(e.x * 100) / 100, y: Math.round(e.y * 100) / 100, hp: Math.round(e.hp), age: e.age, life: e.life, civ: e.civ };
    if (e.role) o.role = e.role;
    if (e.name) o.n = e.name;
    if (e.r) o.r = e.r;
    if (e.home) o.home = e.home;
    if (e.scale !== e.def.scale) o.sc = e.scale;
    if (e.maxHp !== e.def.hp) o.mhp = e.maxHp;
    if (e.dmg !== e.def.dmg) o.dmg = e.dmg;
    if (e.fuse !== undefined) o.fuse = e.fuse;
    if (e.power !== undefined) o.pw = e.power;
    if (e.cloudType) o.ct = e.cloudType;
    if (e.ttx !== undefined) { o.ttx = e.ttx; o.tty = e.tty; }
    const keys = Object.keys(e.data);
    if (keys.length) { const dd = {}; for (const k of keys) { const v = e.data[k]; if (typeof v !== 'object' || v === null || Array.isArray(v)) dd[k] = v; } o.d = dd; }
    return o;
  }
  function deserialize(o) {
    const e = create(o.t, o.x, o.y);
    if (!e) return null;
    e.hp = o.hp; e.age = o.age || 0; e.life = o.life || 0; e.civ = o.civ != null ? o.civ : -1;
    if (o.role) e.role = o.role;
    if (o.n) e.name = o.n;
    if (o.r) e.r = o.r;
    if (o.home) e.home = o.home;
    if (o.sc) e.scale = o.sc;
    if (o.mhp) e.maxHp = o.mhp;
    if (o.dmg !== undefined) e.dmg = o.dmg;
    if (o.fuse !== undefined) e.fuse = o.fuse;
    if (o.pw !== undefined) e.power = o.pw;
    if (o.ct) e.cloudType = o.ct;
    if (o.ttx !== undefined) { e.ttx = o.ttx; e.tty = o.tty; }
    if (o.d) e.data = o.d;
    return e;
  }

  const list = Object.keys(DEFS);
  MB.Entities = {
    DEFS, list, create, spawn, spawnGroup, canStand, canStandDef, damage, kill, heal, animalForTile, populateAnimals, serialize, deserialize, ENTITY_CAP,
    animals: list.filter((k) => DEFS[k].kind === 'animal'),
    monsters: list.filter((k) => DEFS[k].kind === 'monster'),
    mythics: list.filter((k) => DEFS[k].kind === 'mythic'),
  };
})();
