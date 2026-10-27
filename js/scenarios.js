'use strict';
// MineBomb - start scenarios applied right after world generation
(function () {
  const U = MB.util, T = MB.T, TILES = MB.TILES;
  const E = MB.Entities, L = MB.lib, C = MB.Civs;
  const S = {};
  const def = (key, name, icon, desc, apply) => { S[key] = { key, name, icon, desc, apply }; };
  const eachCiv = (w, fn) => { for (const c of w.civs) if (c.alive) fn(c); };
  const randLand = (w, pred) => { const i = w.randomTile((t, idx) => TILES[t].land && TILES[t].walk && (!pred || pred(t, idx)), 300); return i < 0 ? null : { x: (i % w.w) + 0.5, y: ((i / w.w) | 0) + 0.5, i }; };

  def('classic', 'Classic Sandbox', '🌍', 'A fresh world of islands and tribes. Do as you please.', () => {});
  def('zombies', 'Zombie Island', '🧟', 'Graveyards dot the land, the dead rise at night and monsters roam. Can civilization survive?', (w) => {
    w.flags.monsterSpawns = true;
    eachCiv(w, (c) => { for (let k = 0; k < 3; k++) { const x = c.cx + U.rint(-8, 8), y = c.cy + U.rint(-8, 8); if (w.inb(x, y) && TILES[w.get(x, y)].land && w.owner[w.idx(x, y)] < 0) L.paintCircle(w, x, y, 1.5, T.GRAVE, { onlyLand: true }); } E.spawnGroup(w, 'zombie', c.cx + 0.5, c.cy - 10, 4, 2, { force: true }); E.spawn(w, 'hero', c.cx + 0.5, c.cy + 0.5, { civ: c.id, home: { x: c.cx, y: c.cy } }); });
    for (let k = 0; k < 3; k++) { const p = randLand(w); if (p) E.spawn(w, 'zombie_nest', p.x, p.y, { force: true }); }
    w.addLog('The dead do not rest here...', 'disaster');
  });
  def('iceage', 'Ice Age', '🧊', 'A frozen world. Snow, blizzards, mammoths and polar bears. Keep your tribes warm.', (w) => {
    w.flags.iceAge = true; L.setWeather(w, 'snow', 3000);
    for (let i = 0; i < w.n; i++) { const t = w.tiles[i]; if (w.tempAt(i % w.w, (i / w.w) | 0) < 0.6) { if (t === T.GRASS || t === T.FLOWERS || t === T.SAVANNA) w.setIdx(i, T.TUNDRA); else if (t === T.SHALLOW && Math.random() < 0.5) w.setIdx(i, T.FROZEN); } }
    for (let k = 0; k < 12; k++) { const p = randLand(w); if (p) E.spawnGroup(w, U.pick(['mammoth', 'polar_bear', 'penguin', 'yak', 'reindeer']), p.x, p.y, 3, 2); }
    w.markAllDirty();
  });
  def('hell', 'Volcanic Hell', '🌋', 'Volcanoes everywhere, lava flows and imps. Fireproof your favourites.', (w) => {
    for (let k = 0; k < 8; k++) { const p = randLand(w, (t) => t === T.HILLS || t === T.MOUNTAIN || t === T.GRASS); if (p) L.volcano(w, p.x | 0, p.y | 0); }
    for (let k = 0; k < 4; k++) { const p = randLand(w); if (p) E.spawn(w, 'demon_portal', p.x, p.y, { force: true }); }
    L.setWeather(w, 'heat', 2500);
    w.addLog('The ground itself burns.', 'disaster');
  });
  def('war', 'Pangaea Wars', '⚔️', 'Everyone hates everyone. Civilizations are aggressive and start close together.', (w) => {
    eachCiv(w, (c) => { c.personality.aggression = Math.max(0.8, c.personality.aggression); if (!c.traits.includes('aggressive')) c.traits.push('aggressive'); for (const o of w.civs) if (o !== c) c.relations[o.id] = -45; for (let k = 0; k < 6; k++) E.spawn(w, 'soldier', c.cx + 0.5 + U.rfloat(-2, 2), c.cy + 0.5 + U.rfloat(-2, 2), { civ: c.id, home: { x: c.cx, y: c.cy } }); c.gold += 100; });
    w.addLog('Drums of war echo across the land.', 'war');
  });
  def('aliens', 'Alien Invasion', '👽', 'A mothership arrives over the largest island. Humanity must unite or perish.', (w) => {
    const p = randLand(w); if (p) { E.spawn(w, 'alien_mothership', p.x, p.y - 2, { force: true }); E.spawnGroup(w, 'alien', p.x, p.y, 4, 3, { force: true }); }
    eachCiv(w, (c) => { for (const o of w.civs) if (o !== c) c.relations[o.id] = 40; c.era = Math.max(c.era, 2); });
    E.spawn(w, 'ufo', w.w / 2, w.h / 2, { force: true });
    w.addLog('Strange lights fill the sky. They are not friendly.', 'disaster');
  });
  def('eden', 'Garden of Eden', '🌺', 'Paradise: gardens, flowers, reefs, peaceful tribes and gentle wildlife. Nothing bad happens... unless you make it.', (w) => {
    for (let i = 0; i < w.n; i++) { const t = w.tiles[i]; if (t === T.GRASS && Math.random() < 0.3) w.setIdx(i, Math.random() < 0.5 ? T.FLOWERS : T.GARDEN); else if (t === T.SHALLOW && Math.random() < 0.3) w.setIdx(i, T.REEF); w.moist[i] = Math.max(w.moist[i], 180); }
    eachCiv(w, (c) => { c.personality.aggression = 0.05; c.traits = ['peaceful', 'artistic']; c.happiness = 100; });
    w.globalMods.fertility = 2; w.flags.worldPeace = true; w.params.disasters = 0;
    for (let k = 0; k < 6; k++) { const p = randLand(w); if (p) E.spawn(w, U.pick(['unicorn', 'fairy', 'dryad', 'treant']), p.x, p.y, { force: true }); }
    w.markAllDirty();
  });
  def('flood', 'Rising Seas', '🌊', 'The planet is warming and the oceans rise every day. Build high!', (w) => {
    w.flags.warming = true; w.flags.seaRise = true; L.setWeather(w, 'rain', 2000);
    eachCiv(w, (c) => { c.personality.sea = 1; if (!c.traits.includes('seafaring')) c.traits.push('seafaring'); });
    w.addLog('The tide is coming in, and it will not stop.', 'disaster');
  });
  def('dragons', 'Age of Dragons', '🐲', 'Dragon eggs lie scattered in the mountains. Heroes and castles are the only hope.', (w) => {
    for (let k = 0; k < 6; k++) { const p = randLand(w, (t) => t === T.HILLS || t === T.MOUNTAIN || t === T.CAVE); if (p) E.spawn(w, 'dragon_egg', p.x, p.y); }
    const p = randLand(w); if (p) E.spawn(w, 'dragon', p.x, p.y, { force: true });
    eachCiv(w, (c) => { C.setEra(w, c, 3, true); c.stone += 200; c.wood += 200; E.spawn(w, 'hero', c.cx + 0.5, c.cy + 0.5, { civ: c.id, home: { x: c.cx, y: c.cy } }); });
    w.addLog('Dragons stir in the mountains.', 'disaster');
  });
  def('modern', 'Modern Start', '🏙️', 'Civilizations begin in the Modern Age with cities, factories and armies. Pollution included.', (w) => {
    eachCiv(w, (c) => { C.setEra(w, c, 6, true); c.pop = 150; c.gold = 800; c.stone = 600; c.iron = 400; c.wood = 400; c.science = 500; for (let k = 0; k < 10; k++) C.buildSomewhere(w, c, k < 5 ? 'tower_block' : U.pick(['factory', 'school', 'market', 'hospital', 'power_plant', 'farm']), true); w.forRadius(c.cx, c.cy, 6, (x, y, i) => { if (TILES[w.tiles[i]].land && w.owner[i] < 0) w.setOwner(i, c.id); }); C.refreshTileArr(c); });
  });
  def('lonely', 'Lonely Tribe', '🏕️', 'A single tribe on a wild planet full of beasts. Nurture it (or watch it get eaten).', (w) => {
    const civs = w.civs.filter((c) => c.alive); for (let k = 1; k < civs.length; k++) C.killCiv(w, civs[k], 'never existed');
    w.params.maxCivs = 4; E.populateAnimals(w, Math.floor(w.n / 40));
    for (let k = 0; k < 6; k++) { const p = randLand(w); if (p) E.spawnGroup(w, U.pick(['wolf', 'bear', 'lion', 'tiger']), p.x, p.y, 2, 2); }
  });
  def('chaos', 'Chaos World', '🎲', 'Random abilities fire somewhere every few seconds. Anything can happen.', (w) => { w.flags.chaosMode = true; });
  def('plague', 'Plague Lands', '☣️', 'Corruption spreads, rats carry disease, cultists whisper. Purify or perish.', (w) => {
    for (let k = 0; k < 6; k++) { const p = randLand(w); if (p) L.paintCircle(w, p.x, p.y, 2, T.CORRUPT, { onlyLand: true }); }
    for (let k = 0; k < 5; k++) { const p = randLand(w); if (p) E.spawnGroup(w, 'plague_rat', p.x, p.y, 3, 2, { force: true }); }
    for (let k = 0; k < 3; k++) { const p = randLand(w); if (p) E.spawnGroup(w, 'cultist', p.x, p.y, 3, 2, { force: true }); }
    w.addLog('A sickness creeps across the land.', 'disaster');
  });
  def('mythic', 'Mythic Age', '🦄', 'Unicorns, angels, griffins and giants share the world with the tribes. Legends will be written.', (w) => {
    for (let k = 0; k < 14; k++) { const p = randLand(w); if (p) E.spawn(w, U.pick(['unicorn', 'fairy', 'treant', 'griffin', 'pegasus', 'kirin', 'sphinx', 'golem_guardian', 'giant', 'troll', 'witch', 'ent', 'myconid']), p.x, p.y, { force: true }); }
    eachCiv(w, (c) => { c.faith += 50; E.spawn(w, 'wizard', c.cx + 0.5, c.cy + 0.5, { civ: c.id, home: { x: c.cx, y: c.cy } }); });
  });
  def('robots', 'Robot Uprising', '🤖', 'Advanced civilizations face their own creations. Rogue machines hunt the living.', (w) => {
    eachCiv(w, (c) => { C.setEra(w, c, 7, true); c.pop = 120; c.iron = 500; c.stone = 400; c.gold = 500; for (let k = 0; k < 6; k++) C.buildSomewhere(w, c, k < 3 ? 'apartment' : U.pick(['factory', 'laboratory', 'bunker']), true); });
    for (let k = 0; k < 4; k++) { const p = randLand(w); if (p) { E.spawnGroup(w, 'rogue_robot', p.x, p.y, 4, 2, { force: true }); if (k === 0) E.spawn(w, 'terminator', p.x, p.y, { force: true }); } }
    w.addLog('The machines have decided they no longer need us.', 'disaster');
  });
  def('candy', 'Candy Kingdom', '🍭', 'A world made of sweets. Gingerbread people roam and everyone is very happy.', (w) => {
    for (let i = 0; i < w.n; i++) { const t = w.tiles[i]; if ((t === T.GRASS || t === T.FOREST || t === T.SAVANNA) && Math.random() < 0.6) w.setIdx(i, Math.random() < 0.8 ? T.CANDY : T.CHEESE); else if (t === T.FLOWERS) w.setIdx(i, T.RAINBOW); }
    for (let k = 0; k < 10; k++) { const p = randLand(w); if (p) E.spawnGroup(w, 'gingerbread', p.x, p.y, 3, 2); }
    eachCiv(w, (c) => { c.happiness = 100; c.food += 300; });
    w.markAllDirty();
  });
  def('archipelago_race', 'Space Race', '🚀', 'Everyone starts in the Atomic Age with a rocket pad. First to the stars wins bragging rights.', (w) => {
    eachCiv(w, (c) => { C.setEra(w, c, 7, true); c.pop = 200; c.gold = 1500; c.iron = 800; c.stone = 800; c.science = 10000; for (let k = 0; k < 6; k++) C.buildSomewhere(w, c, k < 3 ? 'skyscraper' : U.pick(['laboratory', 'university', 'factory']), true); });
  });

  S.list = Object.keys(S).filter((k) => k !== 'list' && k !== 'apply');
  S.apply = (w, key) => { const sc = S[key]; if (!sc || !sc.apply) return; try { sc.apply(w); } catch (e) { console.error('scenario failed', key, e); } };
  MB.Scenarios = S;
})();
