'use strict';
// MineBomb - tile/terrain definitions
(function () {
  const T = {};
  const TILES = [];
  // props: water, land, walk, build, fert (0..1 fertility), flam (0..1 flammability), pattern (render), elev
  // yield hints: wood, stone, iron, gold, coal, food, science, happy, oil
  function def(key, name, cols, props) {
    const id = TILES.length;
    T[key] = id;
    TILES.push(Object.assign({
      id, key, name, cols, water: false, land: true, walk: true, build: true,
      fert: 0, flam: 0, pattern: 'noise', elev: 0,
    }, props || {}));
  }
  def('DEEP', 'Deep Ocean', ['#0b2a5c', '#0d3270', '#092250'], { water: true, land: false, walk: false, build: false, pattern: 'waves', food: 0.3 });
  def('WATER', 'Ocean', ['#154a8f', '#1b56a3', '#11407c'], { water: true, land: false, walk: false, build: false, pattern: 'waves', food: 0.5 });
  def('SHALLOW', 'Shallows', ['#2f7fc4', '#3b8fd4', '#2770b0'], { water: true, land: false, walk: false, build: false, pattern: 'waves', food: 0.8 });
  def('SAND', 'Beach', ['#e2d08a', '#eedca0', '#cdb974'], { fert: 0.15, pattern: 'dots' });
  def('GRASS', 'Grassland', ['#5cab3c', '#6bbd47', '#4d9632'], { fert: 0.8, flam: 0.4, pattern: 'grass', food: 0.3 });
  def('FOREST', 'Forest', ['#2e7a2a', '#3b8f33', '#245f21'], { fert: 0.5, flam: 0.9, pattern: 'trees', wood: 1, food: 0.2 });
  def('JUNGLE', 'Jungle', ['#1f6a2d', '#2a7f38', '#174f22'], { fert: 0.6, flam: 0.7, pattern: 'trees', wood: 1.2, food: 0.3 });
  def('HILLS', 'Hills', ['#8d8f72', '#a0a284', '#777960'], { fert: 0.3, flam: 0.1, pattern: 'hills', stone: 1, elev: 1 });
  def('MOUNTAIN', 'Mountain', ['#6e6e78', '#8a8a94', '#55555e'], { walk: false, build: false, pattern: 'mountain', stone: 2, elev: 2 });
  def('SNOW', 'Snow', ['#e8f0f6', '#ffffff', '#cdd8e2'], { fert: 0.05, pattern: 'dots' });
  def('DESERT', 'Desert', ['#d9b96c', '#e6c87c', '#c3a35a'], { fert: 0.05, flam: 0.05, pattern: 'dunes' });
  def('SWAMP', 'Swamp', ['#4f6b3a', '#5c7a44', '#40582f'], { fert: 0.4, flam: 0.2, pattern: 'swamp', food: 0.2 });
  def('LAVA', 'Lava', ['#ff5a1f', '#ffa030', '#d63a0a'], { walk: false, build: false, pattern: 'lava', hot: true });
  def('OBSIDIAN', 'Volcanic Rock', ['#2b2630', '#3a3340', '#1c181f'], { fert: 0.02, pattern: 'noise', stone: 1 });
  def('ICE', 'Ice', ['#bfe3f5', '#d8f0fb', '#a3cfe6'], { build: false, pattern: 'ice' });
  def('TUNDRA', 'Tundra', ['#9fae8f', '#afbe9f', '#8a977b'], { fert: 0.2, flam: 0.1, pattern: 'dots', food: 0.1 });
  def('SAVANNA', 'Savanna', ['#b9b35a', '#c9c36a', '#9f9a4a'], { fert: 0.45, flam: 0.6, pattern: 'grass', food: 0.2 });
  def('FARM', 'Farmland', ['#b98a3c', '#c99a4c', '#a07530'], { fert: 1, flam: 0.5, pattern: 'rows', food: 1.5 });
  def('ROAD', 'Road', ['#8b7d6b', '#9b8d7b', '#73665a'], { pattern: 'road' });
  def('RUINS', 'Ruins', ['#6f6a60', '#827c70', '#585349'], { fert: 0.1, pattern: 'ruins', stone: 0.3 });
  def('WASTE', 'Wasteland', ['#5a5048', '#6a6058', '#463e38'], { pattern: 'crack' });
  def('ASH', 'Ash', ['#4a4a4a', '#5a5a5a', '#3a3a3a'], { fert: 0.1, pattern: 'dots' });
  def('MUD', 'Mud', ['#6b4f2e', '#7a5c38', '#553e24'], { fert: 0.5, pattern: 'noise' });
  def('CORRUPT', 'Corruption', ['#5a1e7a', '#7a2ea0', '#3e1255'], { flam: 0.2, pattern: 'corrupt' });
  def('HOLY', 'Holy Ground', ['#e9d98a', '#fff3b0', '#d4c070'], { fert: 0.9, pattern: 'holy', happy: 1 });
  def('CANDY', 'Candy Land', ['#ff8fc8', '#ffb3dc', '#e66fae'], { fert: 0.7, flam: 0.3, pattern: 'candy', food: 1, happy: 1 });
  def('GLASS', 'Fused Glass', ['#8fd3c8', '#b6ece4', '#6fb3a8'], { pattern: 'ice' });
  def('CRATER', 'Crater', ['#4d4740', '#5d5750', '#3a352f'], { pattern: 'crater' });
  def('PAVE', 'Pavement', ['#777777', '#888888', '#666666'], { pattern: 'pave' });
  def('GOLD', 'Gold Vein', ['#8d8f72', '#f1c232', '#777960'], { fert: 0.2, pattern: 'ore', stone: 1, gold: 1, elev: 1 });
  def('IRON', 'Iron Vein', ['#8d8f72', '#b06a4a', '#777960'], { fert: 0.2, pattern: 'ore', stone: 1, iron: 1, elev: 1 });
  def('CRYSTAL', 'Crystal Field', ['#7fd1ff', '#c8f0ff', '#4fa6e0'], { fert: 0.1, pattern: 'crystal', science: 1 });
  def('MUSHROOM', 'Mushroom Grove', ['#8a5fa0', '#c58ad8', '#6b4480'], { fert: 0.5, flam: 0.3, pattern: 'shroom', food: 0.6 });
  def('FLOWERS', 'Flower Meadow', ['#6fbf4a', '#ff6fa0', '#ffe56f'], { fert: 0.9, flam: 0.4, pattern: 'flowers', happy: 1, food: 0.3 });
  def('COBBLE', 'Cobblestone', ['#8d8d8d', '#a0a0a0', '#707070'], { pattern: 'pave' });
  def('BRIDGE', 'Bridge', ['#8b6a3c', '#a07e4a', '#6e5230'], { pattern: 'road', overWater: true });
  def('CAVE', 'Cave Mouth', ['#6e6e78', '#2a2a30', '#55555e'], { pattern: 'cave', stone: 1.5, iron: 0.5, elev: 1 });
  def('MOON', 'Moon Dust', ['#a7a7a7', '#bdbdbd', '#8c8c8c'], { pattern: 'crater' });
  def('BEDROCK', 'Bedrock', ['#333333', '#444444', '#222222'], { build: false, pattern: 'noise' });
  def('CLAY', 'Clay', ['#b0745a', '#c08468', '#95604a'], { fert: 0.3, pattern: 'noise', stone: 0.5 });
  def('COAL', 'Coal Seam', ['#8d8f72', '#222222', '#777960'], { fert: 0.2, pattern: 'ore', stone: 1, coal: 1, elev: 1 });
  def('DIAMOND', 'Diamond Vein', ['#8d8f72', '#9ff5ff', '#777960'], { fert: 0.2, pattern: 'ore', stone: 1, gold: 2, elev: 1 });
  def('OIL', 'Oil Field', ['#3a3a3a', '#1a1a1a', '#555555'], { pattern: 'oil', oil: 1, flam: 0.9 });
  def('GEYSER', 'Geyser', ['#9fae8f', '#ddffff', '#8a977b'], { fert: 0.2, pattern: 'geyser', science: 0.3 });
  def('REEF', 'Coral Reef', ['#2f8fc4', '#ff8f6f', '#2770b0'], { water: true, land: false, walk: false, build: false, pattern: 'reef', food: 1.5 });
  def('TAR', 'Tar Pit', ['#1e1a1a', '#2b2525', '#111111'], { walk: false, build: false, pattern: 'oil', flam: 0.8 });
  def('SLIME', 'Slime Bog', ['#7fe030', '#a0ff50', '#5fb020'], { fert: 0.2, pattern: 'noise' });
  def('METAL', 'Metal Plating', ['#5c6670', '#7a8590', '#444c54'], { pattern: 'pave' });
  def('BONE', 'Bone Field', ['#d8d0b8', '#eee6cc', '#b8b098'], { pattern: 'bones' });
  def('GARDEN', 'Eden Garden', ['#4fcf6f', '#ff9fdf', '#ffef7f'], { fert: 1.2, flam: 0.2, pattern: 'flowers', happy: 2, food: 1 });
  def('SALT', 'Salt Flat', ['#e8e4d8', '#f8f4ea', '#cfcabc'], { pattern: 'crack' });
  def('REDSAND', 'Red Sand', ['#c4603a', '#d4714a', '#a84f2e'], { fert: 0.05, pattern: 'dunes' });
  def('RAINBOW', 'Rainbow Road', ['#ff5f5f', '#5fff8f', '#5f8fff'], { pattern: 'rainbow', happy: 2 });
  def('VOID', 'The Void', ['#050008', '#12001c', '#000000'], { walk: false, build: false, land: false, pattern: 'void' });
  def('CHEESE', 'Cheese', ['#f5c842', '#ffe066', '#d4a62a'], { fert: 0.3, pattern: 'cheese', food: 2, happy: 1 });
  def('FROZEN', 'Frozen Sea', ['#cfe8f3', '#e6f4fa', '#b4d6e8'], { build: false, pattern: 'ice', frozenWater: true });
  def('GRAVE', 'Graveyard', ['#4f5a4a', '#6a7563', '#3a4336'], { fert: 0.2, pattern: 'graves' });
  def('TECHFLOOR', 'Tech Floor', ['#1f3a4a', '#2fd0ff', '#132630'], { pattern: 'tech', science: 1 });
  def('MAGMA', 'Magma Crust', ['#5a2a1a', '#ff6a2a', '#3a1a10'], { fert: 0, pattern: 'lava', hot: true });

  const isWater = (id) => TILES[id].water;
  const isLand = (id) => TILES[id].land;
  const walkable = (id) => TILES[id].walk;
  const buildable = (id) => TILES[id].build && TILES[id].land;
  // tiles that burn to ash
  const BURNABLE = new Set([T.GRASS, T.FOREST, T.JUNGLE, T.SAVANNA, T.FARM, T.FLOWERS, T.MUSHROOM, T.SWAMP, T.CANDY, T.GARDEN, T.OIL]);
  // tiles that can regrow
  const GROWABLE = new Set([T.SAND, T.ASH, T.WASTE, T.MUD, T.DESERT, T.TUNDRA, T.CRATER, T.RUINS, T.SAVANNA, T.CLAY, T.REDSAND, T.SALT, T.GRAVE]);

  MB.T = T;
  MB.TILES = TILES;
  MB.tiles = { isWater, isLand, walkable, buildable, BURNABLE, GROWABLE };
})();
