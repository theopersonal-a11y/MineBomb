'use strict';
// MineBomb - civilizations: data, founding, buildings catalog, diplomacy primitives, serialization
(function () {
  const U = MB.util, T = MB.T, TILES = MB.TILES;
  const E = MB.Entities;

  const ERAS = ['Stone Age', 'Bronze Age', 'Iron Age', 'Medieval Era', 'Renaissance', 'Industrial Age', 'Modern Age', 'Atomic Age', 'Space Age', 'Singularity'];
  const ERA_ICONS = ['🪨', '🥉', '⚔️', '🏰', '🎨', '🏭', '🏙️', '☢️', '🚀', '🧠'];
  const ERA_COST = [60, 160, 380, 750, 1400, 2300, 3600, 5600, 9000, Infinity];
  const ERA_POP = [12, 25, 40, 70, 110, 160, 230, 320, 450, 600];
  const HOUSING = ['hut', 'straw_house', 'wood_house', 'stone_house', 'townhouse', 'apartment', 'tower_block', 'skyscraper', 'arcology', 'arcology'];
  const GOVS_BY_ERA = [['Tribe'], ['Chiefdom'], ['Kingdom', 'Sultanate', 'Theocracy'], ['Kingdom', 'Monarchy', 'Theocracy', 'Sultanate'], ['Kingdom', 'Republic', 'Empire', 'Oligarchy'], ['Empire', 'Republic', 'Kingdom', 'Dictatorship'], ['Democracy', 'Republic', 'Dictatorship', 'Federation'], ['Democracy', 'Federation', 'Technocracy', 'Dictatorship'], ['Federation', 'Technocracy', 'Democracy'], ['Technocracy', 'Hive', 'Federation']];
  const TRAITS = ['aggressive', 'peaceful', 'industrious', 'seafaring', 'religious', 'scientific', 'mercantile', 'expansionist', 'isolationist', 'artistic', 'militaristic', 'agrarian', 'ruthless', 'diplomatic', 'xenophobic', 'resilient'];
  const COLORS = ['#e63946', '#3a86ff', '#ffbe0b', '#8338ec', '#06d6a0', '#ff6b35', '#f72585', '#4cc9f0', '#80b918', '#ffd166', '#b5179e', '#00b4d8', '#ff9f1c', '#9d4edd', '#2ec4b6', '#e76f51', '#c9184a', '#577590', '#f3722c', '#43aa8b'];

  // Buildings catalog. yields are per civ tick (every 10 ticks = 0.5s at 1x)
  const B = {};
  function bdef(key, o) {
    B[key] = Object.assign({ key, name: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), icon: '🏠', era: 0, cat: 'misc', cost: {}, hp: 60, housing: 0, food: 0, wood: 0, stone: 0, iron: 0, gold: 0, science: 0, culture: 0, faith: 0, happy: 0, defense: 0, pollution: 0, military: 0, pattern: 'house', unique: false, site: 'any', max: 0, buildTime: 1 }, o);
  }
  // housing
  bdef('hut', { icon: '🛖', era: 0, cat: 'house', cost: { wood: 4 }, hp: 40, housing: 6, pattern: 'hut' });
  bdef('straw_house', { icon: '🏚️', era: 1, cat: 'house', cost: { wood: 8 }, hp: 60, housing: 10, pattern: 'straw' });
  bdef('wood_house', { icon: '🏠', era: 2, cat: 'house', cost: { wood: 16 }, hp: 90, housing: 16, pattern: 'house' });
  bdef('stone_house', { icon: '🏡', era: 3, cat: 'house', cost: { wood: 10, stone: 16 }, hp: 140, housing: 24, pattern: 'stonehouse' });
  bdef('townhouse', { icon: '🏘️', era: 4, cat: 'house', cost: { wood: 15, stone: 25 }, hp: 180, housing: 36, pattern: 'townhouse' });
  bdef('apartment', { icon: '🏢', era: 5, cat: 'house', cost: { stone: 30, iron: 15 }, hp: 260, housing: 60, pattern: 'apartment' });
  bdef('tower_block', { icon: '🏬', era: 6, cat: 'house', cost: { stone: 45, iron: 30 }, hp: 340, housing: 100, pattern: 'towerblock' });
  bdef('skyscraper', { icon: '🌆', era: 7, cat: 'house', cost: { stone: 50, iron: 60, gold: 20 }, hp: 450, housing: 180, pattern: 'skyscraper' });
  bdef('arcology', { icon: '🏯', era: 8, cat: 'house', cost: { iron: 120, gold: 80, stone: 60 }, hp: 900, housing: 400, pattern: 'arcology' });
  // food
  bdef('farm', { icon: '🌾', era: 0, cat: 'food', cost: { wood: 2 }, hp: 30, food: 3.5, pattern: 'farm', site: 'fertile', buildTime: 0.6 });
  bdef('fishing_hut', { icon: '🎣', era: 0, cat: 'food', cost: { wood: 5 }, hp: 40, food: 4, pattern: 'hut', site: 'coast' });
  bdef('ranch', { icon: '🐄', era: 1, cat: 'food', cost: { wood: 10 }, hp: 60, food: 3, pattern: 'barn', site: 'grass' });
  bdef('granary', { icon: '🏚️', era: 1, cat: 'food', cost: { wood: 12, stone: 4 }, hp: 80, food: 1, happy: 1, pattern: 'barn', max: 3 });
  bdef('dock', { icon: '⚓', era: 2, cat: 'food', cost: { wood: 20 }, hp: 80, food: 6, gold: 1, pattern: 'dock', site: 'coast', boats: true });
  bdef('greenhouse', { icon: '🏡', era: 6, cat: 'food', cost: { iron: 20, stone: 10 }, hp: 120, food: 12, pattern: 'glass' });
  bdef('hydroponics', { icon: '🧪', era: 8, cat: 'food', cost: { iron: 40, gold: 20 }, hp: 200, food: 30, science: 2, pattern: 'glass' });
  // resources
  bdef('lumber_camp', { icon: '🪓', era: 0, cat: 'res', cost: { wood: 1 }, hp: 40, wood: 3, pattern: 'camp', site: 'forest' });
  bdef('quarry', { icon: '⛏️', era: 1, cat: 'res', cost: { wood: 6 }, hp: 60, stone: 3, pattern: 'quarry', site: 'hills' });
  bdef('mine', { icon: '⛏️', era: 2, cat: 'res', cost: { wood: 12 }, hp: 70, stone: 2, iron: 2, gold: 0.4, pattern: 'mine', site: 'hills' });
  bdef('deep_mine', { icon: '🕳️', era: 5, cat: 'res', cost: { iron: 20, stone: 20 }, hp: 120, iron: 5, gold: 1.5, stone: 3, pollution: 1, pattern: 'mine', site: 'hills' });
  bdef('sawmill', { icon: '🪚', era: 3, cat: 'res', cost: { wood: 20, stone: 10 }, hp: 90, wood: 6, pattern: 'factory_s', site: 'forest' });
  bdef('workshop', { icon: '🔨', era: 2, cat: 'res', cost: { wood: 15, stone: 5 }, hp: 80, gold: 1, stone: 1, iron: 0.5, pattern: 'workshop', max: 4 });
  bdef('factory', { icon: '🏭', era: 5, cat: 'res', cost: { iron: 30, stone: 25 }, hp: 200, iron: 3, gold: 5, science: 1, pollution: 3, pattern: 'factory' });
  bdef('power_plant', { icon: '⚡', era: 6, cat: 'res', cost: { iron: 40, stone: 20 }, hp: 220, gold: 6, science: 3, pollution: 5, pattern: 'plant', max: 3 });
  bdef('oil_rig', { icon: '🛢️', era: 6, cat: 'res', cost: { iron: 40 }, hp: 160, gold: 10, pollution: 4, pattern: 'rig', site: 'oil' });
  bdef('solar_farm', { icon: '☀️', era: 7, cat: 'res', cost: { iron: 30, gold: 20 }, hp: 120, gold: 5, science: 3, pattern: 'solar', max: 6 });
  bdef('nuclear_plant', { icon: '☢️', era: 7, cat: 'res', cost: { iron: 80, gold: 40 }, hp: 300, gold: 12, science: 8, pattern: 'nuclear', max: 2, meltdown: true });
  bdef('fusion_reactor', { icon: '🔆', era: 8, cat: 'res', cost: { iron: 150, gold: 100 }, hp: 500, gold: 25, science: 20, pattern: 'nuclear', max: 1 });
  bdef('robot_factory', { icon: '🤖', era: 8, cat: 'res', cost: { iron: 100, gold: 60 }, hp: 300, iron: 8, gold: 8, science: 4, pollution: 1, pattern: 'factory', max: 2, robots: true });
  // culture / happiness / science
  bdef('shrine', { icon: '⛩️', era: 0, cat: 'culture', cost: { wood: 6 }, hp: 50, faith: 1, happy: 1, culture: 0.5, pattern: 'shrine', max: 2 });
  bdef('temple', { icon: '🛕', era: 2, cat: 'culture', cost: { stone: 25 }, hp: 150, faith: 3, happy: 2, culture: 1.5, pattern: 'temple', max: 2 });
  bdef('cathedral', { icon: '⛪', era: 3, cat: 'culture', cost: { stone: 70, gold: 20 }, hp: 300, faith: 6, happy: 4, culture: 4, pattern: 'cathedral', unique: true });
  bdef('market', { icon: '🏪', era: 2, cat: 'culture', cost: { wood: 15 }, hp: 80, gold: 3, happy: 1, pattern: 'market', max: 4 });
  bdef('library', { icon: '📚', era: 2, cat: 'science', cost: { wood: 20, stone: 5 }, hp: 90, science: 1.5, culture: 0.5, pattern: 'library', max: 2 });
  bdef('school', { icon: '🏫', era: 3, cat: 'science', cost: { stone: 25 }, hp: 120, science: 3, pattern: 'school', max: 3 });
  bdef('university', { icon: '🎓', era: 4, cat: 'science', cost: { stone: 50, gold: 15 }, hp: 200, science: 6, culture: 2, pattern: 'university', max: 2 });
  bdef('laboratory', { icon: '🔬', era: 6, cat: 'science', cost: { iron: 40, gold: 30 }, hp: 200, science: 12, pattern: 'lab', max: 2 });
  bdef('theater', { icon: '🎭', era: 4, cat: 'culture', cost: { wood: 25, stone: 20 }, hp: 140, culture: 3, happy: 2, pattern: 'theater', max: 2 });
  bdef('tavern', { icon: '🍺', era: 2, cat: 'culture', cost: { wood: 12 }, hp: 70, happy: 2, gold: 1, pattern: 'house', max: 3 });
  bdef('plaza', { icon: '⛲', era: 3, cat: 'culture', cost: { stone: 15 }, hp: 60, happy: 2, culture: 1, pattern: 'plaza', max: 2 });
  bdef('statue', { icon: '🗽', era: 2, cat: 'culture', cost: { stone: 20 }, hp: 100, culture: 2, happy: 1, pattern: 'statue', max: 2 });
  bdef('monument', { icon: '🗿', era: 3, cat: 'culture', cost: { stone: 80 }, hp: 300, culture: 6, happy: 2, pattern: 'monument', unique: true });
  bdef('hospital', { icon: '🏥', era: 5, cat: 'culture', cost: { stone: 40, iron: 15 }, hp: 200, happy: 2, pattern: 'hospital', max: 2, health: true });
  bdef('stadium', { icon: '🏟️', era: 6, cat: 'culture', cost: { stone: 60, iron: 30 }, hp: 250, happy: 6, gold: 2, pattern: 'stadium', unique: true });
  bdef('well', { icon: '🪣', era: 1, cat: 'culture', cost: { stone: 4 }, hp: 50, happy: 1, pattern: 'well', max: 2 });
  bdef('park', { icon: '🌳', era: 5, cat: 'culture', cost: { wood: 10 }, hp: 60, happy: 2, pattern: 'park', max: 3 });
  bdef('airport', { icon: '✈️', era: 6, cat: 'culture', cost: { iron: 60, stone: 40 }, hp: 250, gold: 6, culture: 2, pattern: 'airport', unique: true });
  bdef('internet_hub', { icon: '🌐', era: 7, cat: 'science', cost: { iron: 50, gold: 50 }, hp: 200, science: 10, culture: 4, happy: 1, pattern: 'lab', unique: true });
  // military
  bdef('barracks', { icon: '🏕️', era: 1, cat: 'military', cost: { wood: 15 }, hp: 120, military: 1, pattern: 'barracks', max: 5 });
  bdef('wall', { icon: '🧱', era: 2, cat: 'military', cost: { stone: 4 }, hp: 220, defense: 1, pattern: 'wall', site: 'border', buildTime: 0.5 });
  bdef('tower', { icon: '🗼', era: 2, cat: 'military', cost: { stone: 15 }, hp: 200, defense: 2, pattern: 'tower', site: 'border', range: 5, max: 8 });
  bdef('castle', { icon: '🏰', era: 3, cat: 'military', cost: { stone: 80 }, hp: 600, defense: 5, housing: 12, military: 2, pattern: 'castle', unique: true, range: 6 });
  bdef('fort', { icon: '🛡️', era: 5, cat: 'military', cost: { stone: 50, iron: 20 }, hp: 500, defense: 4, military: 1, pattern: 'fort', range: 7, max: 2 });
  bdef('bunker', { icon: '🧱', era: 7, cat: 'military', cost: { stone: 60, iron: 40 }, hp: 900, defense: 6, pattern: 'bunker', range: 8, max: 2 });
  bdef('missile_silo', { icon: '🚀', era: 7, cat: 'military', cost: { iron: 100, gold: 60 }, hp: 400, defense: 2, pattern: 'silo', unique: true, missiles: true });
  bdef('shield_generator', { icon: '🔮', era: 8, cat: 'military', cost: { iron: 120, gold: 100 }, hp: 500, defense: 10, pattern: 'nuclear', unique: true, shield: 5 });
  // infrastructure / wonders
  bdef('port', { icon: '🚢', era: 2, cat: 'infra', cost: { wood: 30, stone: 10 }, hp: 150, gold: 3, food: 2, pattern: 'port', site: 'coast', boats: true, max: 2 });
  bdef('harbor', { icon: '🛳️', era: 5, cat: 'infra', cost: { stone: 40, iron: 20 }, hp: 250, gold: 8, food: 4, pattern: 'port', site: 'coast', boats: true, max: 2 });
  bdef('rocket_pad', { icon: '🚀', era: 8, cat: 'infra', cost: { iron: 150, gold: 120 }, hp: 300, science: 5, pattern: 'silo', unique: true, rockets: true });
  bdef('pyramid', { icon: '🔺', era: 1, cat: 'wonder', cost: { stone: 60, wood: 10 }, hp: 800, culture: 5, faith: 3, happy: 2, pattern: 'pyramid', unique: true, wonder: true });
  bdef('colossus', { icon: '🗿', era: 2, cat: 'wonder', cost: { stone: 60, iron: 20, gold: 20 }, hp: 600, culture: 6, gold: 4, pattern: 'monument', unique: true, wonder: true, site: 'coast' });
  bdef('lighthouse', { icon: '🗼', era: 2, cat: 'wonder', cost: { stone: 50 }, hp: 400, food: 4, gold: 3, culture: 2, pattern: 'lighthouse', unique: true, wonder: true, site: 'coast' });
  bdef('observatory', { icon: '🔭', era: 4, cat: 'wonder', cost: { stone: 80, gold: 40 }, hp: 400, science: 10, culture: 3, pattern: 'observatory', unique: true, wonder: true });
  bdef('great_library', { icon: '🏛️', era: 3, cat: 'wonder', cost: { stone: 100, wood: 40 }, hp: 500, science: 8, culture: 6, pattern: 'university', unique: true, wonder: true });
  bdef('opera_house', { icon: '🎼', era: 5, cat: 'wonder', cost: { stone: 100, iron: 30, gold: 50 }, hp: 500, culture: 10, happy: 5, pattern: 'theater', unique: true, wonder: true });
  bdef('mega_dome', { icon: '🔘', era: 7, cat: 'wonder', cost: { iron: 200, gold: 100, stone: 100 }, hp: 1500, happy: 8, culture: 8, science: 5, pattern: 'dome', unique: true, wonder: true });
  bdef('space_elevator', { icon: '🛗', era: 8, cat: 'wonder', cost: { iron: 400, gold: 300 }, hp: 2000, science: 30, gold: 20, culture: 10, pattern: 'elevator', unique: true, wonder: true });
  bdef('world_tree', { icon: '🌳', era: 0, cat: 'wonder', cost: {}, hp: 3000, food: 10, happy: 5, culture: 5, faith: 5, pattern: 'worldtree', unique: true, wonder: true });
  bdef('ruin_marker', { icon: '🏚️', era: 0, cat: 'misc', cost: {}, hp: 1, pattern: 'house' });

  const WONDERS = Object.keys(B).filter((k) => B[k].wonder);

  function fullName(c) {
    const n = c.name;
    switch (c.gov) {
      case 'Tribe': return `${n} Tribe`;
      case 'Chiefdom': return `Chiefdom of ${n}`;
      case 'Kingdom': return `Kingdom of ${n}`;
      case 'Monarchy': return `Crown of ${n}`;
      case 'Sultanate': return `Sultanate of ${n}`;
      case 'Theocracy': return `Holy ${n}`;
      case 'Empire': return `${n} Empire`;
      case 'Republic': return `Republic of ${n}`;
      case 'Oligarchy': return `${n} Trade League`;
      case 'Democracy': return `United ${n}`;
      case 'Dictatorship': return `${n} State`;
      case 'Federation': return `${n} Federation`;
      case 'Technocracy': return `${n} Collective`;
      case 'Hive': return `${n} Hive`;
      case 'Cult': return `Cult of ${n}`;
      case 'Communes': return `${n} Communes`;
      case 'Anarchy': return `Free ${n}`;
      default: return n;
    }
  }

  function newLeader(c, world) {
    const female = Math.random() < 0.5;
    c.leader = { name: U.humanName(), title: U.leaderTitle(c.gov, female), since: world ? world.tick : 0, female, traitBonus: U.pick(['wise', 'brave', 'greedy', 'kind', 'mad', 'cunning', 'pious', 'builder', 'warlord', 'dreamer']) };
    c.leaderSpawnDue = true;
  }

  function makeCiv(world, x, y, opts) {
    opts = opts || {};
    const id = world.civs.length;
    const rng = opts.rng || null;
    const name = opts.name || U.civName(rng);
    const color = COLORS[id % COLORS.length];
    const traits = U.shuffle(TRAITS.slice()).slice(0, 2);
    const c = {
      id, name, color, color2: U.shade(color, -60), alive: true, cx: x, cy: y, founded: world.tick,
      pop: opts.pop || 10, food: 40, wood: 30, stone: 10, iron: 0, gold: 10, science: 0, culture: 0, faith: 0,
      era: opts.era || 0, happiness: 60, health: 100, fear: 0, gov: 'Tribe', traits,
      relations: {}, wars: {}, allies: {},
      tiles: new Set(), tileArr: [], buildings: new Set(),
      soldiers: 0, deaths: 0, kills: 0, plague: null, immune: 0, goldenAge: 0, darkAge: 0,
      ticks: 0, unrest: 0, boatsOut: 0, colonies: 0, spaceLaunches: 0, warsFought: 0, maxPop: opts.pop || 10,
      flags: {}, yields: null, lastWarTick: -99999, history: [], leader: null, religion: null, mods: { growth: 1, science: 1, yields: 1 },
      personality: {
        aggression: U.clamp(0.3 + (traits.includes('aggressive') ? 0.35 : 0) + (traits.includes('militaristic') ? 0.25 : 0) + (traits.includes('ruthless') ? 0.25 : 0) - (traits.includes('peaceful') ? 0.3 : 0) - (traits.includes('diplomatic') ? 0.15 : 0) + U.rfloat(-0.1, 0.1), 0, 1),
        expansion: U.clamp(0.5 + (traits.includes('expansionist') ? 0.3 : 0) - (traits.includes('isolationist') ? 0.3 : 0) + U.rfloat(-0.15, 0.15), 0.1, 1),
        sea: U.clamp(0.3 + (traits.includes('seafaring') ? 0.5 : 0) + U.rfloat(-0.1, 0.1), 0, 1),
        science: U.clamp(0.4 + (traits.includes('scientific') ? 0.4 : 0) + U.rfloat(-0.1, 0.1), 0, 1),
        piety: U.clamp(0.3 + (traits.includes('religious') ? 0.5 : 0) + U.rfloat(-0.1, 0.1), 0, 1),
        trade: U.clamp(0.4 + (traits.includes('mercantile') ? 0.4 : 0) + U.rfloat(-0.1, 0.1), 0, 1),
        industry: U.clamp(0.4 + (traits.includes('industrious') ? 0.4 : 0) + U.rfloat(-0.1, 0.1), 0, 1),
      },
    };
    c.gov = U.pick(GOVS_BY_ERA[c.era]);
    newLeader(c, world);
    return c;
  }

  function found(world, x, y, opts) {
    opts = opts || {};
    if (!world.inb(x, y)) return null;
    const i = world.idx(x, y);
    if (!TILES[world.tiles[i]].build) {
      // find nearby buildable
      let fx = -1, fy = -1;
      world.forRadius(x, y, 3, (xx, yy, j) => { if (fx < 0 && TILES[world.tiles[j]].build && world.owner[j] < 0) { fx = xx; fy = yy; } });
      if (fx < 0) return null;
      x = fx; y = fy;
    }
    if (world.owner[world.idx(x, y)] >= 0 && !opts.force) return null;
    const c = makeCiv(world, x, y, opts);
    world.civs.push(c);
    // claim initial territory
    const r = opts.radius || 3;
    world.forRadius(x, y, r, (xx, yy, j) => { if (TILES[world.tiles[j]].land && world.owner[j] < 0) world.setOwner(j, c.id); });
    refreshTileArr(c);
    // initial buildings
    const hutType = HOUSING[c.era];
    build(world, c, hutType, x, y, true);
    const spots = [];
    world.forRadius(x, y, 2, (xx, yy, j, d) => { if (d > 0 && TILES[world.tiles[j]].build && !world.buildings.has(j) && world.owner[j] === c.id) spots.push([xx, yy]); });
    U.shuffle(spots);
    let nh = Math.min(spots.length, Math.max(1, Math.round(c.pop / 8)));
    for (let k = 0; k < nh; k++) build(world, c, hutType, spots[k][0], spots[k][1], true);
    // farm if possible
    for (let k = nh; k < spots.length; k++) { const j = world.idx(spots[k][0], spots[k][1]); if (TILES[world.tiles[j]].fert >= 0.4) { build(world, c, 'farm', spots[k][0], spots[k][1], true); break; } }
    // visible humans
    const n = Math.min(12, Math.max(3, Math.round(c.pop / 4)));
    for (let k = 0; k < n; k++) E.spawn(world, 'human', x + 0.5 + U.rfloat(-2, 2), y + 0.5 + U.rfloat(-2, 2), { civ: c.id, role: 'civilian', home: { x: x + 0.5, y: y + 0.5 } });
    c.history.push({ t: world.tick, text: `Founded at (${x}, ${y})` });
    return c;
  }

  function foundColony(world, civ, x, y, pop) {
    if (!civ.alive) return;
    const i = world.idx(x, y);
    if (!TILES[world.tiles[i]].build || world.owner[i] >= 0) {
      let fx = -1, fy = -1;
      world.forRadius(x, y, 3, (xx, yy, j) => { if (fx < 0 && TILES[world.tiles[j]].build && world.owner[j] < 0) { fx = xx; fy = yy; } });
      if (fx < 0) return;
      x = fx; y = fy;
    }
    world.forRadius(x, y, 2.5, (xx, yy, j) => { if (TILES[world.tiles[j]].land && world.owner[j] < 0) world.setOwner(j, civ.id); });
    build(world, civ, HOUSING[Math.min(civ.era, 3)], x, y, true);
    civ.pop += pop || 5;
    civ.colonies++;
    for (let k = 0; k < 3; k++) E.spawn(world, 'human', x + 0.5 + U.rfloat(-1, 1), y + 0.5 + U.rfloat(-1, 1), { civ: civ.id, role: 'civilian', home: { x: x + 0.5, y: y + 0.5 } });
    world.addLog(`${fullName(civ)} founded a colony.`, 'civ', x, y);
    refreshTileArr(civ);
  }

  function refreshTileArr(c) { c.tileArr = Array.from(c.tiles); }

  function canAfford(c, bd, mult = 1) {
    for (const k in bd.cost) if ((c[k] || 0) < bd.cost[k] * mult) return false;
    return true;
  }
  function pay(c, bd, mult = 1) { for (const k in bd.cost) c[k] -= bd.cost[k] * mult; }

  function build(world, c, type, x, y, instant, free) {
    const bd = B[type];
    if (!bd || !world.inb(x, y)) return null;
    const i = world.idx(x, y);
    const t = world.tiles[i];
    if (!TILES[t].build) return null;
    if (world.buildings.has(i)) world.destroyBuilding(i, false);
    if (world.owner[i] !== c.id) world.setOwner(i, c.id);
    if (!free && !instant && !canAfford(c, bd)) return null;
    if (!free && !instant) pay(c, bd);
    const b = { i, x, y, t: type, civ: c.id, hp: bd.hp, maxHp: bd.hp, prog: instant ? 1 : 0, lvl: 0 };
    world.buildings.set(i, b);
    c.buildings.add(i);
    if (instant) completeBuilding(world, c, b);
    world.markDirty(x, y);
    return b;
  }
  function completeBuilding(world, c, b) {
    b.prog = 1;
    const bd = B[b.t];
    const i = b.i;
    if (b.t === 'farm') world.setIdx(i, T.FARM);
    else if (b.t === 'plaza' || b.t === 'park') { if (b.t === 'plaza') world.setIdx(i, T.PAVE); else world.setIdx(i, T.FLOWERS); }
    if (bd.wonder) { world.addLog(`${fullName(c)} completed the ${bd.name}!`, 'good', b.x, b.y); c.culture += 50; c.happiness = Math.min(100, c.happiness + 10); c.history.push({ t: world.tick, text: `Built the ${bd.name}` }); }
    // roads to a nearby house
    if (c.era >= 1 && bd.cat !== 'military' && b.t !== 'farm' && b.t !== 'wall') laySimpleRoad(world, c, b);
    if (world.fire[i]) world.extinguish(i);
    world.markDirty(b.x, b.y);
  }
  function laySimpleRoad(world, c, b) {
    // connect to nearest other building within 7 tiles via straight line over plain land
    let best = null, bd = Infinity;
    world.forRadius(b.x, b.y, 7, (x, y, i, d) => { if (d > 1.5 && d < bd) { const o = world.buildings.get(i); if (o && o.civ === c.id && B[o.t].cat === 'house') { bd = d; best = o; } } });
    if (!best) return;
    const roadTile = c.era >= 5 ? T.PAVE : c.era >= 3 ? T.COBBLE : T.ROAD;
    let x = b.x, y = b.y;
    const dx = Math.sign(best.x - x), dy = Math.sign(best.y - y);
    let guard = 0;
    while ((x !== best.x || y !== best.y) && guard++ < 20) {
      if (x !== best.x && (y === best.y || Math.random() < 0.5)) x += dx; else y += dy;
      const i = world.idx(x, y);
      if (world.buildings.has(i)) continue;
      const t = world.tiles[i];
      if ((t === T.GRASS || t === T.SAND || t === T.SAVANNA || t === T.TUNDRA || t === T.FLOWERS || t === T.ROAD || t === T.COBBLE || t === T.MUD || t === T.ASH || t === T.DESERT || t === T.SNOW) && world.owner[i] === c.id) world.setIdx(i, roadTile);
    }
  }

  // ---------- diplomacy ----------
  function rel(a, b) { return a.relations[b.id] || 0; }
  function changeRelation(world, a, b, delta) {
    if (!a || !b || a === b) return;
    a.relations[b.id] = U.clamp((a.relations[b.id] || 0) + delta, -100, 100);
    b.relations[a.id] = U.clamp((b.relations[a.id] || 0) + delta, -100, 100);
  }
  function declareWar(world, a, b, reason) {
    if (!a.alive || !b.alive || a === b || a.wars[b.id]) return false;
    if (world.flags.worldPeace) return false;
    a.wars[b.id] = world.tick; b.wars[a.id] = world.tick;
    a.relations[b.id] = Math.min(a.relations[b.id] || 0, -60); b.relations[a.id] = Math.min(b.relations[a.id] || 0, -60);
    delete a.allies[b.id]; delete b.allies[a.id];
    a.warsFought++; b.warsFought++;
    a.lastWarTick = b.lastWarTick = world.tick;
    a.happiness -= 5; b.happiness -= 8;
    world.addLog(`${fullName(a)} declared war on ${fullName(b)}${reason ? ' (' + reason + ')' : ''}!`, 'war', a.cx, a.cy);
    a.history.push({ t: world.tick, text: `Declared war on ${b.name}` });
    b.history.push({ t: world.tick, text: `Attacked by ${a.name}` });
    // allies join
    for (const k in b.allies) { const ally = world.civs[+k]; if (ally && ally.alive && ally !== a && !ally.wars[a.id] && Math.random() < 0.7) declareWar(world, ally, a, `defending ${b.name}`); }
    return true;
  }
  function makePeace(world, a, b, silent) {
    if (!a.wars[b.id]) return;
    delete a.wars[b.id]; delete b.wars[a.id];
    a.relations[b.id] = Math.max(a.relations[b.id] || 0, -25); b.relations[a.id] = Math.max(b.relations[a.id] || 0, -25);
    a.happiness += 5; b.happiness += 5;
    if (!silent) world.addLog(`${fullName(a)} and ${fullName(b)} signed a peace treaty.`, 'peace', a.cx, a.cy);
  }
  function ally(world, a, b) {
    if (a === b || !a.alive || !b.alive) return;
    if (a.wars[b.id]) makePeace(world, a, b, true);
    a.allies[b.id] = true; b.allies[a.id] = true;
    a.relations[b.id] = Math.max(a.relations[b.id] || 0, 75); b.relations[a.id] = Math.max(b.relations[a.id] || 0, 75);
    world.addLog(`${fullName(a)} and ${fullName(b)} formed an alliance!`, 'peace', a.cx, a.cy);
  }

  // ---------- conquest ----------
  function captureTile(world, i, attacker, defender) {
    if (!attacker.alive) return;
    const x = i % world.w, y = (i / world.w) | 0;
    const isCapital = defender && defender.cx === x && defender.cy === y;
    world.forRadius(x, y, 1.5, (xx, yy, j) => {
      if (world.owner[j] === (defender ? defender.id : -2)) {
        world.setOwner(j, attacker.id);
        const b = world.buildings.get(j);
        if (b) {
          if (Math.random() < 0.55 || B[b.t].wonder) { if (defender) defender.buildings.delete(j); b.civ = attacker.id; attacker.buildings.add(j); b.hp = Math.max(10, b.hp * 0.6); }
          else world.destroyBuilding(j, true);
        }
      }
    });
    if (defender) { defender.fear = Math.min(100, defender.fear + 3); defender.happiness -= 1; attacker.kills++; }
    if (isCapital && defender) captureCapital(world, defender, attacker);
    attacker.tileArr = Array.from(attacker.tiles);
    if (defender) defender.tileArr = Array.from(defender.tiles);
  }
  function captureCapital(world, defender, attacker) {
    attacker.gold += defender.gold * 0.5; defender.gold *= 0.5;
    attacker.pop += defender.pop * 0.25; defender.pop *= 0.6;
    attacker.happiness = Math.min(100, attacker.happiness + 15);
    attacker.science += defender.science * 0.3;
    world.addLog(`${fullName(attacker)} captured the capital of ${fullName(defender)}!`, 'war', defender.cx, defender.cy);
    if (defender.tiles.size < 6 || defender.pop < 8) { killCiv(world, defender, `conquered by ${attacker.name}`); makePeaceAll(world, attacker, defender); return; }
    // relocate capital to the owned tile with a house farthest from attacker capital
    let best = -1, bd = -1;
    for (const j of defender.tiles) {
      const b = world.buildings.get(j);
      const score = (b && B[b.t].cat === 'house' ? 50 : 0) + U.dist(j % world.w, (j / world.w) | 0, attacker.cx, attacker.cy);
      if (score > bd) { bd = score; best = j; }
    }
    if (best >= 0) { defender.cx = best % world.w; defender.cy = (best / world.w) | 0; world.addLog(`${fullName(defender)} moved its capital.`, 'civ', defender.cx, defender.cy); }
    if (Math.random() < 0.5) makePeace(world, attacker, defender);
  }
  function makePeaceAll(world, a, b) { if (a.wars[b.id]) { delete a.wars[b.id]; delete b.wars[a.id]; } }

  function killCiv(world, c, reason) {
    if (!c.alive) return;
    c.alive = false;
    c.diedTick = world.tick; c.deathReason = reason;
    for (const j of Array.from(c.tiles)) {
      world.owner[j] = -1;
      const b = world.buildings.get(j);
      if (b) { if (Math.random() < 0.6) world.destroyBuilding(j, true); else { world.buildings.delete(j); world.tiles[j] = T.RUINS; } }
      world.markDirtyIdx(j);
    }
    c.tiles.clear(); c.tileArr = []; c.buildings.clear();
    for (const e of world.entities) {
      if (e.civ === c.id && !e.dead) {
        if (e.type === 'soldier' && Math.random() < 0.5) { e.civ = -1; e.type = 'bandit'; e.def = E.DEFS.bandit; e.kind = 'monster'; }
        else if (e.type === 'leader' || e.type === 'boat' || e.type === 'warship' || e.type === 'fishing_boat') { e.dead = true; }
        else { e.civ = -1; e.role = 'wild'; e.home = null; }
      }
    }
    for (const o of world.civs) { delete o.wars[c.id]; delete o.allies[c.id]; }
    world.deadCivs.push({ name: fullName(c), founded: c.founded, died: world.tick, reason, maxPop: Math.round(c.maxPop), era: c.era, color: c.color });
    world.addLog(`${fullName(c)} has fallen (${reason}).`, 'death', c.cx, c.cy);
  }

  function setEra(world, c, era, silent) {
    era = U.clamp(Math.round(era), 0, ERAS.length - 1);
    if (era === c.era) return;
    const up = era > c.era;
    c.era = era;
    const govs = GOVS_BY_ERA[era];
    if (!govs.includes(c.gov) && Math.random() < 0.8) { c.gov = U.pick(govs); c.leader.title = U.leaderTitle(c.gov, c.leader.female); }
    c.upgradeHousing = 30;
    if (!silent) world.addLog(`${fullName(c)} ${up ? 'entered' : 'fell back to'} the ${ERAS[era]}! ${ERA_ICONS[era]}`, up ? 'good' : 'bad', c.cx, c.cy);
    c.history.push({ t: world.tick, text: `${up ? 'Entered' : 'Regressed to'} the ${ERAS[era]}` });
    if (up && era >= 1) c.happiness = Math.min(100, c.happiness + 8);
    c.science = Math.min(c.science, ERA_COST[era] * 0.5);
    world.markAllDirty();
  }

  function plague(world, c, severity) {
    if (!c.alive || c.immune > 0 || c.plague) return false;
    if (world.flags.noPlague) return false;
    const hospitals = countBuildings(world, c, (b) => B[b.t].health);
    severity *= Math.max(0.2, 1 - hospitals * 0.3);
    c.plague = { timer: Math.round(500 + severity * 1500), severity };
    world.addLog(`Plague spreads through ${fullName(c)}!`, 'disaster', c.cx, c.cy);
    c.history.push({ t: world.tick, text: 'Struck by plague' });
    return true;
  }
  function countBuildings(world, c, pred) {
    let n = 0;
    for (const j of c.buildings) { const b = world.buildings.get(j); if (b && (!pred || pred(b))) n++; }
    return n;
  }
  function leaderDied(world, c, cause) {
    if (!c.alive) return;
    c.happiness -= 15; c.unrest += 10;
    const old = c.leader ? `${c.leader.title} ${c.leader.name}` : 'The leader';
    newLeader(c, world);
    world.addLog(`${old} of ${fullName(c)} has died (${cause}). ${c.leader.title} ${c.leader.name} takes power.`, 'civ', c.cx, c.cy);
    c.history.push({ t: world.tick, text: `${old} died (${cause})` });
  }
  function grantWish(world, c) {
    const r = Math.random();
    if (r < 0.1) { plague(world, c, 0.5); c.gold = 0; world.addLog(`The genie tricked ${fullName(c)}! Misfortune follows.`, 'bad', c.cx, c.cy); return; }
    const wish = U.pick(['gold', 'pop', 'era', 'peace', 'joy', 'wonder', 'knowledge', 'army']);
    switch (wish) {
      case 'gold': c.gold += 800; break;
      case 'pop': c.pop += 60; break;
      case 'era': setEra(world, c, c.era + 1); break;
      case 'peace': for (const k in c.wars) makePeace(world, c, world.civs[+k]); for (const o of world.civs) if (o.alive && o !== c) changeRelation(world, c, o, 40); break;
      case 'joy': c.happiness = 100; c.flags.blessed = 2000; break;
      case 'wonder': { const wk = WONDERS.filter((k) => B[k].era <= c.era + 1 && !hasBuilding(world, c, k)); if (wk.length) buildSomewhere(world, c, U.pick(wk), true); } break;
      case 'knowledge': c.science += ERA_COST[c.era] * 0.8; break;
      case 'army': for (let k = 0; k < 10; k++) E.spawn(world, 'soldier', c.cx + 0.5 + U.rfloat(-2, 2), c.cy + 0.5 + U.rfloat(-2, 2), { civ: c.id, home: { x: c.cx, y: c.cy } }); break;
    }
    world.addLog(`A genie granted ${fullName(c)} a wish: ${wish}!`, 'good', c.cx, c.cy);
  }
  function hasBuilding(world, c, type) { for (const j of c.buildings) { const b = world.buildings.get(j); if (b && b.t === type) return true; } return false; }
  function buildSomewhere(world, c, type, instant) {
    const bd = B[type];
    const site = findSite(world, c, bd);
    if (!site) return null;
    return build(world, c, type, site.x, site.y, instant, true);
  }

  // site finding
  function siteOk(world, c, bd, i) {
    const t = world.tiles[i];
    const td = TILES[t];
    if (!td.build || world.buildings.has(i)) return false;
    if (world.owner[i] !== c.id) return false;
    if (t === T.ROAD || t === T.COBBLE || t === T.PAVE) return bd.site === 'border' ? false : Math.random() < 0.1;
    if (t === T.FARM && bd.key !== 'farm') return false;
    if (td.hot || t === T.CORRUPT || t === T.VOID) return false;
    const x = i % world.w, y = (i / world.w) | 0;
    switch (bd.site) {
      case 'fertile': return td.fert >= 0.4 && t !== T.FOREST && t !== T.JUNGLE;
      case 'coast': return world.isCoastal(i);
      case 'forest': { let f = false; world.neighbors8(i, (j) => { if (world.tiles[j] === T.FOREST || world.tiles[j] === T.JUNGLE) f = true; }); return f; }
      case 'hills': { if (td.elev >= 1 || t === T.CAVE) return true; let h = false; world.neighbors4(i, (j) => { if (TILES[world.tiles[j]].elev >= 1) h = true; }); return h && bd.key === 'quarry'; }
      case 'grass': return t === T.GRASS || t === T.SAVANNA || t === T.FLOWERS;
      case 'oil': return t === T.OIL;
      case 'border': { let b = false; world.neighbors4(i, (j) => { if (world.owner[j] !== c.id) b = true; }); return b && t !== T.FARM; }
      default: return t !== T.FOREST && t !== T.JUNGLE || Math.random() < 0.3;
    }
  }
  function findSite(world, c, bd) {
    const arr = c.tileArr;
    if (!arr || !arr.length) return null;
    let best = null, bs = -Infinity;
    const tries = Math.min(arr.length, 45);
    for (let k = 0; k < tries; k++) {
      const i = arr[(Math.random() * arr.length) | 0];
      if (!siteOk(world, c, bd, i)) continue;
      const x = i % world.w, y = (i / world.w) | 0;
      let score = -U.dist(x, y, c.cx, c.cy) * (bd.site === 'border' || bd.site === 'forest' || bd.site === 'hills' || bd.site === 'coast' || bd.site === 'fertile' ? 0.15 : 0.6) + Math.random() * 2;
      let adj = 0; world.neighbors8(i, (j) => { if (world.buildings.has(j)) adj++; if (world.tiles[j] === T.ROAD || world.tiles[j] === T.COBBLE || world.tiles[j] === T.PAVE) adj += 0.5; });
      if (bd.cat === 'house' || bd.cat === 'culture' || bd.cat === 'science') score += Math.min(adj, 3) * 1.5; else if (bd.key === 'farm') score += adj > 2 ? -2 : 0;
      if (bd.site === 'hills') { const t = world.tiles[i]; if (TILES[t].gold || TILES[t].iron || TILES[t].coal) score += 5; }
      if (score > bs) { bs = score; best = { x, y, i }; }
    }
    return best;
  }

  function serialize(c) {
    const o = Object.assign({}, c);
    delete o.tiles; delete o.tileArr; delete o.buildings; delete o.yields;
    return o;
  }
  function deserialize(o) {
    const c = Object.assign({ relations: {}, wars: {}, allies: {}, flags: {}, history: [], mods: { growth: 1, science: 1, yields: 1 }, personality: { aggression: 0.4, expansion: 0.5, sea: 0.3, science: 0.5, piety: 0.3, trade: 0.4, industry: 0.4 } }, o);
    c.tiles = new Set(); c.tileArr = []; c.buildings = new Set(); c.yields = null;
    c.color2 = U.shade(c.color, -60);
    if (!c.leader) newLeader(c, null);
    return c;
  }

  MB.Civs = {
    ERAS, ERA_ICONS, ERA_COST, ERA_POP, HOUSING, GOVS_BY_ERA, TRAITS, COLORS, BUILDINGS: B, WONDERS,
    fullName, newLeader, makeCiv, found, foundColony, refreshTileArr, canAfford, pay, build, completeBuilding,
    rel, changeRelation, declareWar, makePeace, ally, captureTile, captureCapital, killCiv, setEra, plague,
    countBuildings, leaderDied, grantWish, hasBuilding, buildSomewhere, findSite, siteOk, serialize, deserialize,
  };
})();
