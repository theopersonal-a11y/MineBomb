'use strict';
// MineBomb - effects library shared by abilities, entities and world events
(function () {
  const U = MB.util, T = MB.T, TILES = MB.TILES;
  const E = MB.Entities;
  const L = {};
  const NATURAL = new Set([T.DEEP, T.WATER, T.SHALLOW, T.SAND, T.GRASS, T.FOREST, T.JUNGLE, T.HILLS, T.MOUNTAIN, T.SNOW, T.DESERT, T.SWAMP, T.TUNDRA, T.SAVANNA, T.MUD, T.ASH, T.REEF]);

  L.explode = (world, x, y, o) => {
    o = o || {};
    const r = o.r || 3, power = o.power || 50;
    if (world.isShielded && world.isShielded(x, y) && !o.ignoreShield) { MB.fx.ring(x, y, r, '#a0e9ff', 15, 2); return; }
    world.forRadius(x, y, r, (tx, ty, i, d) => {
      const f = 1 - d / r;
      const b = world.buildings.get(i);
      if (b && !(b.shielded >= world.tick - 2)) {
        b.hp -= power * f * 1.2;
        if (b.hp <= 0) { const civ = world.civs[b.civ]; if (civ) { civ.fear = Math.min(100, civ.fear + 1); civ.happiness -= 0.5; } world.destroyBuilding(i, d > r * 0.45); }
      }
      const t = world.tiles[i], td = TILES[t];
      if (!o.noTerrain && t !== T.BEDROCK && t !== T.VOID) {
        if (o.crater && d < r * 0.45 && td.land) { world.setIdx(i, (o.nuke && t === T.SAND) ? T.GLASS : T.CRATER); world.height[i] = Math.max(129, world.height[i] - 8); }
        else if (d < r * 0.8 && td.land && (t === T.FOREST || t === T.JUNGLE || t === T.FARM || t === T.FLOWERS || t === T.MUSHROOM) && Math.random() < 0.5 * f + 0.2) world.setIdx(i, o.nuke ? T.WASTE : T.ASH);
        else if (o.nuke && d < r * 0.95 && (t === T.GRASS || t === T.SAVANNA || t === T.SWAMP) && Math.random() < 0.6) world.setIdx(i, T.WASTE);
        else if (o.glass && t === T.SAND && Math.random() < 0.7) world.setIdx(i, T.GLASS);
        else if (d < r * 0.5 && (t === T.ROAD || t === T.COBBLE || t === T.PAVE) && Math.random() < 0.5) world.setIdx(i, T.RUINS);
      }
      if (o.fire && td.flam > 0 && Math.random() < o.fire * f + 0.05) world.ignite(i, 120 + power * 0.5);
      if (o.rad) world.rad[i] = Math.min(255, world.rad[i] + o.rad * (0.4 + 0.6 * f));
      if (o.poll) world.poll[i] = Math.min(255, world.poll[i] + o.poll * f);
    });
    world.near(x, y, r + 1, (e, d) => {
      if (e.kind === 'special' && e.type !== 'bomb' && e.type !== 'landmine') return;
      const f = Math.max(0, 1 - d / (r + 1));
      if (e.type === 'bomb' || e.type === 'landmine') { if (f > 0.1 && (e.fuse === undefined || e.fuse > 3)) e.fuse = 3; return; }
      if (o.sparePeople && e.kind === 'human') return;
      if (o.spareBuildings) {} // handled above by noTerrain usage
      E.damage(world, e, power * f * (o.nuke ? 3 : 1.4), o.cause || 'explosion');
      if (!e.dead) { const dx = e.x - x, dy = e.y - y, dd = d || 0.01; e.vx += (dx / dd) * f * 0.5; e.vy += (dy / dd) * f * 0.5; }
    });
    const civ = world.civAt(x | 0, y | 0);
    if (civ && civ.alive) { civ.fear = Math.min(100, civ.fear + power / 25); if (o.nuke) world.addLog(`☢️ Nuclear detonation in ${MB.Civs.fullName(civ)}!`, 'disaster', x, y); }
    if (!o.silent) { if (o.nuke) MB.fx.mushroomCloud(x, y, r); else MB.fx.explosion(x, y, r, o.color); }
    if (o.cause === 'player') world.playerStats.bombs++;
    if (o.nuke && !world.flags.noNuclearWinter && Math.random() < 0.5 && r >= 8) { world.weather.type = 'snow'; world.weather.timer = 1500; }
  };

  L.earthquake = (world, x, y, r, strength) => {
    world.forRadius(x, y, r, (tx, ty, i, d) => {
      const f = 1 - d / r;
      const b = world.buildings.get(i);
      if (b && !(b.shielded >= world.tick - 2)) { b.hp -= strength * 70 * f * Math.random(); if (b.hp <= 0) world.destroyBuilding(i, true); }
      const t = world.tiles[i];
      if (Math.random() < strength * 0.12 * f) {
        if ((t === T.GRASS || t === T.SAVANNA || t === T.FARM) && Math.random() < 0.4) world.setIdx(i, T.MUD);
        else if (t === T.HILLS && Math.random() < 0.2) world.setIdx(i, T.MOUNTAIN);
        else if ((t === T.ROAD || t === T.COBBLE || t === T.PAVE) && Math.random() < 0.6) world.setIdx(i, T.RUINS);
        else if (TILES[t].land && TILES[t].build && Math.random() < 0.15 * strength) { world.setIdx(i, T.CRATER); }
        else if (world.isCoastal(i) && TILES[t].land && Math.random() < 0.15 * strength && world.height[i] < 140) { world.setIdx(i, T.SHALLOW); world.height[i] = 125; }
      }
      if (strength > 0.9 && t === T.MOUNTAIN && Math.random() < 0.02) world.setIdx(i, T.LAVA);
    });
    world.near(x, y, r, (e, d) => { const f = 1 - d / r; if (e.kind !== 'special') { E.damage(world, e, strength * 12 * f, 'earthquake'); e.vx += U.rfloat(-0.2, 0.2) * f; e.vy += U.rfloat(-0.2, 0.2) * f; } });
    MB.fx.shake(10 + strength * 15);
    MB.fx.debris(x, y, 20, '#8d8f72');
    if (MB.audio) MB.audio.play('rumble');
  };

  L.freeze = (world, x, y, r) => {
    world.forRadius(x, y, r, (tx, ty, i, d) => {
      const t = world.tiles[i];
      if (TILES[t].water && t !== T.DEEP) world.setIdx(i, T.FROZEN);
      else if (t === T.LAVA || t === T.MAGMA) world.setIdx(i, T.OBSIDIAN);
      else if ((t === T.GRASS || t === T.FOREST || t === T.SAVANNA || t === T.FLOWERS || t === T.JUNGLE || t === T.SWAMP || t === T.MUD) && Math.random() < 0.7) world.setIdx(i, T.SNOW);
      else if (t === T.DESERT && Math.random() < 0.5) world.setIdx(i, T.TUNDRA);
      world.extinguish(i);
    });
    world.near(x, y, r, (e) => { if (e.kind !== 'special' && !e.def.element) { e.frozen = 200; E.damage(world, e, 10, 'frost'); } });
    MB.fx.ring(x, y, r, '#a0e9ff', 20, 2);
    MB.fx.sparkle(x, y, '#fff', 12);
    if (MB.audio) MB.audio.play('freeze');
  };

  L.meltdown = (world, x, y) => {
    L.explode(world, x + 0.5, y + 0.5, { r: 5, power: 140, rad: 160, fire: 0.3, crater: true, cause: 'meltdown' });
    world.forRadius(x, y, 9, (tx, ty, i) => { world.rad[i] = Math.min(255, world.rad[i] + 60); });
  };

  const PROJ = { arrow: { speed: 0.45, dmg: 10 }, cannon: { speed: 0.35, dmg: 30 }, fireball: { speed: 0.3, dmg: 25 }, laser: { speed: 0.9, dmg: 30 }, bullet: { speed: 0.8, dmg: 14 }, snowball: { speed: 0.3, dmg: 2 } };
  L.fireProjectile = (world, shooter, tx, ty, kind, dmg) => {
    const pd = PROJ[kind] || PROJ.arrow;
    const p = E.spawn(world, 'projectile', shooter.x, shooter.y - 0.2, { ttx: tx, tty: ty, speed: pd.speed, dmg: dmg != null ? dmg : pd.dmg, civ: shooter.civ != null ? shooter.civ : -1, force: true });
    if (p) { p.data.kind = kind; p.data.owner = shooter; p.noSave = true; }
    if (MB.audio && Math.random() < 0.3) MB.audio.play(kind === 'laser' ? 'laser' : kind === 'cannon' ? 'cannon' : 'arrow');
    return p;
  };

  L.paintCircle = (world, x, y, r, tile, o) => {
    o = o || {};
    const td = TILES[tile];
    let n = 0;
    world.forRadius(x, y, r, (tx, ty, i, d) => {
      if (o.noise !== false && r > 1.5 && d > r * 0.7 && U.hash2(tx, ty, (world.tick * 7) | 0) > (r - d) / (r * 0.3)) return;
      if (o.prob != null && Math.random() > o.prob) return;
      const cur = world.tiles[i], cd = TILES[cur];
      if (o.onlyLand && !cd.land) return;
      if (o.onlyWater && !cd.water) return;
      if (o.keepBuildings && world.buildings.has(i)) return;
      if (o.skip && o.skip.has(cur)) return;
      if (cur === T.BEDROCK && !o.force) return;
      if (td.water) { world.height[i] = Math.min(world.height[i], tile === T.DEEP ? 60 : tile === T.WATER ? 100 : 120); }
      else if (cd.water && td.land) { world.height[i] = Math.max(world.height[i], td.elev === 2 ? 230 : td.elev === 1 ? 200 : 136); }
      else if (td.elev === 2) world.height[i] = Math.max(world.height[i], 225);
      else if (td.elev === 1) world.height[i] = Math.max(world.height[i], 195);
      else if (cd.elev >= 1 && td.elev === 0) world.height[i] = Math.min(world.height[i], 185);
      world.setIdx(i, tile);
      if (o.moist != null) world.moist[i] = o.moist;
      n++;
    });
    return n;
  };
  L.reclassify = (world, x, y, r) => {
    world.forRadius(x, y, r, (tx, ty, i) => {
      const cur = world.tiles[i];
      if (!NATURAL.has(cur) && !TILES[cur].water) return;
      const nt = world.classify(tx, ty);
      if (nt !== cur) world.setIdx(i, nt);
    });
  };
  L.raiseLand = (world, x, y, r, amt) => {
    world.forRadius(x, y, r, (tx, ty, i, d) => { const f = 1 - d / r; world.height[i] = U.clamp(Math.round(world.height[i] + amt * (0.3 + 0.7 * f)), 0, 255); });
    L.reclassify(world, x, y, r);
  };
  L.flood = (world, x, y, r, level) => {
    world.forRadius(x, y, r, (tx, ty, i) => { if (world.height[i] < (level || 150) && TILES[world.tiles[i]].land) { world.setIdx(i, T.SHALLOW); world.height[i] = 122; } });
    MB.fx.splash(x, y, 8);
  };
  L.tsunami = (world, x, y, r) => {
    world.forRadius(x, y, r, (tx, ty, i, d) => {
      const t = world.tiles[i], td = TILES[t];
      if (!td.land) return;
      if (world.height[i] > 175) return;
      const b = world.buildings.get(i); if (b && !(b.shielded >= world.tick - 2)) { b.hp -= 120 * (1 - d / r); if (b.hp <= 0) world.destroyBuilding(i, true); }
      if (d < r * 0.35 && world.height[i] < 140 && Math.random() < 0.6) { world.setIdx(i, T.SHALLOW); world.height[i] = 124; }
      else if (t === T.GRASS || t === T.FARM || t === T.FLOWERS || t === T.SAVANNA || t === T.ROAD) world.setIdx(i, T.MUD);
      else if ((t === T.FOREST || t === T.JUNGLE) && Math.random() < 0.4) world.setIdx(i, T.SWAMP);
      world.moist[i] = 255; world.extinguish(i);
    });
    world.near(x, y, r, (e, d) => { if (e.kind !== 'special' && e.habitat !== 'air') { E.damage(world, e, 40 * (1 - d / r), 'tsunami'); e.vx += U.rfloat(-0.4, 0.4); e.vy += U.rfloat(-0.4, 0.4); } });
    MB.fx.wave(x, y, 0, 0, r);
    MB.fx.shake(8);
    if (MB.audio) MB.audio.play('wave');
  };
  L.volcano = (world, x, y) => {
    world.forRadius(x, y, 2.2, (tx, ty, i, d) => { if (!TILES[world.tiles[i]].land && d > 1) return; world.height[i] = Math.max(world.height[i], d < 1 ? 240 : 215); world.setIdx(i, d < 1.2 ? T.MOUNTAIN : T.HILLS); });
    L.erupt(world, x, y, 1);
  };
  L.erupt = (world, x, y, power) => {
    const n = 4 + power * 6;
    for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, d = U.rfloat(1, 2.5 + power); const tx = Math.round(x + Math.cos(a) * d), ty = Math.round(y + Math.sin(a) * d); if (world.inb(tx, ty) && TILES[world.get(tx, ty)].land) world.set(tx, ty, T.LAVA); }
    world.forRadius(x, y, 5 + power * 2, (tx, ty, i, d) => { if (Math.random() < 0.15 && TILES[world.tiles[i]].flam > 0) world.ignite(i, 120); if (Math.random() < 0.2 && (world.tiles[i] === T.GRASS || world.tiles[i] === T.FOREST)) world.setIdx(i, T.ASH); world.poll[i] = Math.min(255, world.poll[i] + 10); });
    world.near(x, y, 4 + power, (e, d) => { if (e.kind !== 'special') E.damage(world, e, 30 * power * (1 - d / (4 + power)), 'eruption'); });
    MB.fx.explosion(x, y, 3 + power, '#ff5a1f');
    for (let k = 0; k < 20; k++) MB.fx.ember(x + U.rfloat(-1, 1), y + U.rfloat(-1, 1));
    MB.fx.smoke(x, y, 15);
    world.shake = 10;
  };
  L.killIn = (world, x, y, r, pred, cause) => {
    let n = 0;
    world.near(x, y, r, (e) => { if (!pred || pred(e)) { if (E.damage(world, e, 1e9, cause || 'player')) n++; } });
    return n;
  };
  L.damageIn = (world, x, y, r, amt, pred, cause) => { world.near(x, y, r, (e) => { if (!pred || pred(e)) E.damage(world, e, amt, cause || 'player'); }); };
  L.healIn = (world, x, y, r, amt, pred) => { world.near(x, y, r, (e) => { if (!pred || pred(e)) E.heal(e, amt); }); };
  L.damageBuildingsIn = (world, x, y, r, amt, ruins = true) => { world.forRadius(x, y, r, (tx, ty, i, d) => { const b = world.buildings.get(i); if (b && !(b.shielded >= world.tick - 2)) { b.hp -= amt * (1 - d / (r + 1)); if (b.hp <= 0) world.destroyBuilding(i, ruins); } }); };
  L.igniteCircle = (world, x, y, r, prob, amount) => { let n = 0; world.forRadius(x, y, r, (tx, ty, i) => { if (Math.random() < (prob == null ? 0.5 : prob) && world.ignite(i, amount || 140)) n++; }); return n; };
  L.extinguishCircle = (world, x, y, r) => { world.forRadius(x, y, r, (tx, ty, i) => { world.extinguish(i); if (world.tiles[i] === T.LAVA) world.setIdx(i, T.OBSIDIAN); }); };
  L.spawnCircle = (world, type, x, y, n, r, extra) => E.spawnGroup(world, type, x, y, n, r, extra);
  L.civAtOrNear = (world, x, y, maxD) => {
    const c = world.civAt(x | 0, y | 0);
    if (c && c.alive) return c;
    let best = null, bd = (maxD || 12) * (maxD || 12);
    world.forRadius(x, y, maxD || 12, (tx, ty, i, d) => { const o = world.owner[i]; if (o >= 0 && d * d < bd && world.civs[o] && world.civs[o].alive) { bd = d * d; best = world.civs[o]; } });
    return best;
  };
  L.nearestCiv = (world, x, y) => { let best = null, bd = Infinity; for (const c of world.civs) { if (!c.alive) continue; const d = U.dist2(c.cx, c.cy, x, y); if (d < bd) { bd = d; best = c; } } return best; };
  L.spawnCloud = (world, x, y, r, type, life, extra) => { const c = E.spawn(world, 'cloud', x, y, Object.assign({ r, cloudType: type, life: life || 900 }, extra || {})); if (c) world.playerStats.rains++; return c; };
  L.setWeather = (world, type, dur, lock) => { world.weather.type = type; world.weather.timer = dur || 1500; world.weather.intensity = 1; if (lock !== undefined) world.weather.lock = lock; };
  L.castAbility = (world, ab, x, y, r, silent) => { if (!MB.Abilities || !MB.game) return; const ctx = MB.Abilities.makeCtx(MB.game, world, x, y, r || ab.r || 3, ab); ctx.silent = !!silent; try { ab.fn(ctx); } catch (err) { console.warn('ability error', ab.id, err); } };
  L.allCivs = (world) => world.civs.filter((c) => c.alive);
  L.transferTile = (world, i, civ) => { world.setOwner(i, civ.id); const b = world.buildings.get(i); if (b && b.civ !== civ.id) { const old = world.civs[b.civ]; if (old) old.buildings.delete(i); b.civ = civ.id; civ.buildings.add(i); } };
  L.circleTiles = (world, x, y, r) => { const out = []; world.forRadius(x, y, r, (tx, ty, i) => out.push(i)); return out; };
  L.fillRegion = (world, x, y, tile, maxN) => {
    // flood fill same-tile region
    if (!world.inb(x, y)) return 0;
    const start = world.idx(x, y), src = world.tiles[start];
    if (src === tile) return 0;
    const stack = [start], seen = new Set([start]);
    let n = 0;
    while (stack.length && n < (maxN || 4000)) {
      const i = stack.pop();
      world.setIdx(i, tile);
      if (TILES[tile].water) world.height[i] = Math.min(world.height[i], 120); else if (TILES[src].water) world.height[i] = Math.max(world.height[i], 136);
      n++;
      world.neighbors4(i, (j) => { if (!seen.has(j) && world.tiles[j] === src) { seen.add(j); stack.push(j); } });
    }
    return n;
  };

  MB.lib = L;
})();
