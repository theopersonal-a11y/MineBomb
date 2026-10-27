'use strict';
// MineBomb - entity AI (monsters, mythics, special objects) + updateAll
(function () {
  const U = MB.util, T = MB.T, TILES = MB.TILES;
  const E = MB.Entities, AI = MB.AI;
  const { moveToward, pickWander, wander, fleeFrom, findById, attack, isEnemyOf, nearestEnemy, nearestMonster, hazards } = MB.AIcore;

  function nearestBuilding(world, x, y, r, pred) {
    let best = null, bd = Infinity;
    world.forRadius(x, y, r, (xx, yy, i, d) => {
      if (d < bd) { const b = world.buildings.get(i); if (b && (!pred || pred(b))) { bd = d; best = b; } }
    });
    return best;
  }
  function nearestCivCapital(world, x, y, pred) {
    let best = null, bd = Infinity;
    for (const c of world.civs) {
      if (!c.alive) continue;
      if (pred && !pred(c)) continue;
      const d = U.dist2(x, y, c.cx, c.cy);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  function damageBuilding(world, b, amt, cause) {
    if (!b || (b.shielded && b.shielded >= world.tick - 2)) return;
    b.hp -= amt;
    if (b.hp <= 0) {
      const civ = world.civs[b.civ];
      world.destroyBuilding(b.i, true);
      MB.fx.smoke(b.x + 0.5, b.y + 0.5, 4);
      if (civ) { civ.happiness -= 1; civ.fear = Math.min(100, (civ.fear || 0) + 2); }
    }
  }

  // ---------- monsters ----------
  AI.monster = (world, e) => {
    if (e.cd > 0) e.cd--;
    const d = e.def;
    if (d.regen && e.hp < e.maxHp && world.tick % 10 === 0) e.hp += d.regen;
    if (d.nocturnal) {
      const day = world.daylight() > 0.6;
      if (day && e.type === 'werewolf') { wander(world, e, 4, e.home, 0.6); return; }
      e.dmgMult = day ? 0.5 : 1.5;
    }
    if (e.data.calmed > 0) { e.data.calmed--; wander(world, e, 4, e.home); return; }
    if ((e.id + world.tick) % 10 === 0) {
      let t = world.nearest(e.x, e.y, d.aggroR, (o) => !o.dead && o !== e && (o.kind === 'human' || o.kind === 'mythic' || (o.kind === 'animal' && (o.type === 'dog' || o.type === 'cat')) || (o.kind === 'monster' && !o.def.hostile)) && !(o.def.ethereal));
      if (!t && d.steal) t = world.nearest(e.x, e.y, d.aggroR, (o) => o.def.livestock);
      // repelled by totems
      if (world.repelPoints) for (const p of world.repelPoints) if (U.dist(e.x, e.y, p.x, p.y) < p.r) { e.fleeing = p; e.fleeT = 30; t = null; }
      e.target = t ? t.id : 0;
      if (!t) {
        const b = nearestBuilding(world, e.x, e.y, d.boss ? 14 : 7);
        if (b) { e.tx = b.x + 0.5; e.ty = b.y + 0.5; e.hasTarget = true; e.timer = 300; e.bTarget = b.i; }
        else if (d.boss && (e.id + world.tick) % 100 === 0) { const c = nearestCivCapital(world, e.x, e.y); if (c) { e.tx = c.cx + 0.5; e.ty = c.cy + 0.5; e.hasTarget = true; e.timer = 2000; } }
      }
    }
    if (e.fleeT > 0 && e.fleeing) { e.fleeT--; fleeFrom(world, e, e.fleeing); return; }
    const t = findById(world, e.target);
    if (t) {
      moveToward(world, e, t.x, t.y, e.speed);
      if (d.ranged && U.dist(e.x, e.y, t.x, t.y) < d.range + 1 && e.cd <= 0) { e.cd = d.atkCd + 10; MB.lib.fireProjectile(world, e, t.x, t.y, d.ranged === 'laser' ? 'laser' : 'cannon', e.dmg); }
      else if (attack(world, e, t, e.dmgMult || 1)) {
        if (d.steal && t.civ >= 0 && world.civs[t.civ]) { world.civs[t.civ].gold = Math.max(0, world.civs[t.civ].gold - 10); }
        if (e.type === 'bandit' && t.civ >= 0 && world.civs[t.civ]) { world.civs[t.civ].gold = Math.max(0, world.civs[t.civ].gold - 5); }
        if (d.mindControl && t.type === 'soldier' && Math.random() < 0.3 && t.civ >= 0) { t.civ = -1; t.type = 'raider'; t.def = E.DEFS.raider; t.kind = 'monster'; MB.fx.sparkle(t.x, t.y, '#9370db', 6); }
      }
    } else if (e.hasTarget) {
      if (moveToward(world, e, e.tx, e.ty, e.speed) || e.blocked > 20) { e.hasTarget = false; e.blocked = 0; }
      e.timer--; if (e.timer <= 0) e.hasTarget = false;
    } else wander(world, e, 6, e.home);
    // trample buildings
    if ((e.id + world.tick) % 10 === 0) {
      const b = world.buildings.get(world.idx(e.x | 0, e.y | 0));
      if (b) damageBuilding(world, b, d.crush ? 40 : d.sabotage ? 25 : e.dmg * 0.6, e.type);
      if (d.crush) world.forRadius(e.x, e.y, 1.2, (x, y, i) => { const bb = world.buildings.get(i); if (bb && bb !== b) damageBuilding(world, bb, 25, e.type); });
      if (d.ignites && !world.flags.fireproof) { const i = world.idx(e.x | 0, e.y | 0); if (TILES[world.tiles[i]].flam > 0 && Math.random() < 0.3) world.ignite(i, 100); }
      if (d.wasteTrail) { const i = world.idx(e.x | 0, e.y | 0); if (TILES[world.tiles[i]].land && TILES[world.tiles[i]].build) world.setIdx(i, T.WASTE); }
      if (d.chaos && Math.random() < 0.05) { const ab = U.pick(MB.ABILITIES.filter((a) => a.cat === 'Destruction' || a.cat === 'Terrain')); if (ab && !ab.global) MB.lib.castAbility(world, ab, e.x, e.y, 2, true); }
    }
  };
  AI.flyer = (world, e) => {
    if (e.cd > 0) e.cd--;
    const d = e.def;
    if ((e.id + world.tick) % 12 === 0) {
      if (!e.hasTarget || e.timer <= 0) {
        // dragons seek buildings (rich civs), harpies seek humans
        const b = nearestBuilding(world, e.x, e.y, d.boss ? 25 : 12);
        if (b) { e.tx = b.x + 0.5; e.ty = b.y + 0.5; e.hasTarget = true; e.timer = 400; }
        else { const c = nearestCivCapital(world, e.x, e.y); if (c && Math.random() < 0.5) { e.tx = c.cx + 0.5; e.ty = c.cy + 0.5; e.hasTarget = true; e.timer = 1500; } }
      }
      const t = world.nearest(e.x, e.y, 6, (o) => !o.dead && (o.kind === 'human' || o.kind === 'mythic' || (o.kind === 'animal' && d.boss)));
      e.target = t ? t.id : 0;
    }
    if (e.hasTarget) { if (moveToward(world, e, e.tx, e.ty, e.speed) || e.blocked > 10) { e.hasTarget = false; e.blocked = 0; } e.timer--; }
    else wander(world, e, 12, null);
    const t = findById(world, e.target);
    if (t) attack(world, e, t);
    // breath weapons
    if (d.breath && e.cd <= 0 && (e.id + world.tick) % 5 === 0) {
      const near = nearestBuilding(world, e.x, e.y, 2.5) || (t && U.dist(e.x, e.y, t.x, t.y) < 2.5 ? t : null);
      if (near) {
        e.cd = 35;
        MB.fx.breath(e.x, e.y, d.breath);
        world.forRadius(e.x, e.y, 1.8, (x, y, i) => {
          if (d.breath === 'fire') { if (Math.random() < 0.6) world.ignite(i, 140); const b = world.buildings.get(i); if (b) damageBuilding(world, b, 30, e.type); }
          else if (d.breath === 'ice') { const tt = world.tiles[i]; if (TILES[tt].water) world.setIdx(i, T.FROZEN); else if (tt === T.GRASS || tt === T.FOREST) world.setIdx(i, T.SNOW); const b = world.buildings.get(i); if (b) damageBuilding(world, b, 20, e.type); }
          else if (d.breath === 'void') { const b = world.buildings.get(i); if (b) damageBuilding(world, b, 60, e.type); if (Math.random() < 0.3 && TILES[world.tiles[i]].land) world.setIdx(i, T.CORRUPT); }
        });
        world.near(e.x, e.y, 2, (o) => { if (o !== e && !o.dead && o.kind !== 'special' && !(d.breath === 'fire' && o.fireproof)) E.damage(world, o, 20, d.breath, e); });
      }
    }
    if (d.boss && e.hp < e.maxHp && world.tick % 20 === 0) e.hp += 1;
  };
  AI.seamonster = (world, e) => {
    if (e.cd > 0) e.cd--;
    if ((e.id + world.tick) % 15 === 0) {
      const boat = world.nearest(e.x, e.y, 10, (o) => !o.dead && (o.type === 'boat' || o.type === 'warship' || o.type === 'fishing_boat' || o.type === 'pirate_ship' || o.type === 'human' && o.habitat === 'water' || o.type === 'whale'));
      if (boat) e.target = boat.id;
      else {
        e.target = 0;
        if (!e.hasTarget) {
          // nearest coastal building
          const b = nearestBuilding(world, e.x, e.y, 20);
          if (b) { // approach nearest water tile adjacent to it
            let wx = -1, wy = -1, bd = Infinity;
            world.forRadius(b.x, b.y, 3, (x, y, i, dd) => { if (TILES[world.tiles[i]].water && dd < bd) { bd = dd; wx = x; wy = y; } });
            if (wx >= 0) { e.tx = wx + 0.5; e.ty = wy + 0.5; e.hasTarget = true; e.timer = 500; e.bTarget = b.i; }
          }
        }
      }
    }
    const t = findById(world, e.target);
    if (t) { moveToward(world, e, t.x, t.y, e.speed); attack(world, e, t); return; }
    if (e.hasTarget) {
      const arrived = moveToward(world, e, e.tx, e.ty, e.speed);
      e.timer--;
      if (arrived || e.blocked > 10) {
        // smash buildings within 2.5
        if (e.cd <= 0) {
          e.cd = 40;
          world.forRadius(e.x, e.y, 2.6, (x, y, i) => { const b = world.buildings.get(i); if (b) damageBuilding(world, b, 60, e.type); });
          world.near(e.x, e.y, 2.5, (o) => { if (o !== e && !o.dead && o.kind === 'human') E.damage(world, o, e.dmg, e.type, e); });
          MB.fx.splash(e.x, e.y, 3);
          world.shake = Math.max(world.shake, 4);
        }
        if (!world.buildings.get(e.bTarget) || e.timer <= 0) e.hasTarget = false;
      }
      return;
    }
    wander(world, e, 8, null);
  };
  AI.kaiju = (world, e) => {
    if ((e.id + world.tick) % 40 === 0 || !e.hasTarget) {
      const b = nearestBuilding(world, e.x, e.y, 30);
      if (b) { e.tx = b.x + 0.5; e.ty = b.y + 0.5; e.hasTarget = true; }
      else { const c = nearestCivCapital(world, e.x, e.y); if (c) { e.tx = c.cx + 0.5; e.ty = c.cy + 0.5; e.hasTarget = true; } else e.hasTarget = false; }
    }
    if (e.hasTarget) { if (moveToward(world, e, e.tx, e.ty, e.speed)) e.hasTarget = false; if (e.blocked > 15) { e.hasTarget = false; e.blocked = 0; pickWander(world, e, 6); } }
    else wander(world, e, 8, null);
    if (world.tick % 6 === 0) {
      world.forRadius(e.x, e.y, 1.8, (x, y, i) => {
        const b = world.buildings.get(i); if (b) damageBuilding(world, b, 80, e.type);
        if (world.tiles[i] === T.FOREST && Math.random() < 0.3) world.setIdx(i, T.GRASS);
      });
      world.near(e.x, e.y, 1.8, (o) => { if (o !== e && !o.dead && o.kind !== 'special' && !o.def.boss) E.damage(world, o, e.dmg, e.type, e); });
      world.shake = Math.max(world.shake, 2);
    }
    if (world.tick % 300 === 0) { MB.fx.roar(e.x, e.y); world.shake = 10; world.near(e.x, e.y, 12, (o) => { if (o.kind === 'human' || o.kind === 'animal') { o.fleeing = e.id; o.fleeT = 80; } }); }
    if (e.cd > 0) e.cd--;
    if (e.hp < e.maxHp && world.tick % 20 === 0) e.hp += 2;
  };
  AI.ghost = (world, e) => {
    wander(world, e, 8, e.home);
    if ((e.id + world.tick) % 20 === 0) {
      world.near(e.x, e.y, 4, (o) => { if (o.kind === 'human' || o.kind === 'animal') { o.fleeing = e.id; o.fleeT = 40; if (e.def.scream && Math.random() < 0.3) E.damage(world, o, 2, 'fear', e); } });
      const c = world.civAt(e.x | 0, e.y | 0); if (c) c.happiness -= 0.3;
      if (e.dmg > 5) { const t = world.nearest(e.x, e.y, 2, (o) => o.kind === 'human'); if (t) attack(world, e, t); }
    }
    if (e.cd > 0) e.cd--;
  };
  AI.necromancer = (world, e) => {
    AI.monster(world, e);
    if ((e.id + world.tick) % (e.type === 'lich' ? 120 : 220) === 0) {
      let minions = 0; world.near(e.x, e.y, 10, (o) => { if (o.type === 'skeleton' || o.type === 'zombie') minions++; });
      if (minions < 10) { const s = E.spawn(world, Math.random() < 0.7 ? 'skeleton' : 'zombie', e.x + U.rfloat(-1.5, 1.5), e.y + U.rfloat(-1.5, 1.5)); if (s) MB.fx.puff(s.x, s.y, '#4a0a4a', 5); }
    }
  };
  AI.witch = (world, e) => {
    AI.monster(world, e);
    if ((e.id + world.tick) % 60 === 0) {
      const h = world.nearest(e.x, e.y, 5, (o) => o.kind === 'human' && o.type !== 'hero');
      if (h && Math.random() < 0.5) { E.kill(world, h, 'witchcraft'); h.noFx = true; E.spawn(world, 'frog', h.x, h.y, { force: true }); MB.fx.puff(h.x, h.y, '#7b2cbf', 8); }
    }
  };
  AI.assassin = (world, e) => {
    if (e.cd > 0) e.cd--;
    if ((e.id + world.tick) % 30 === 0 || !e.target) { const l = world.nearest(e.x, e.y, 80, (o) => o.type === 'leader'); e.target = l ? l.id : 0; }
    const t = findById(world, e.target);
    if (t) { moveToward(world, e, t.x, t.y, e.speed); if (attack(world, e, t)) { if (t.dead) { E.kill(world, e, 'vanished'); e.noFx = true; } } return; }
    wander(world, e, 8, null);
  };
  AI.cultist = (world, e) => {
    AI.monster(world, e);
    if ((e.id + world.tick) % 25 === 0) { const i = world.idx(e.x | 0, e.y | 0); if (TILES[world.tiles[i]].land && world.tiles[i] !== T.HOLY && Math.random() < 0.5) world.setIdx(i, T.CORRUPT); }
  };
  AI.goo = (world, e) => {
    wander(world, e, 3, null);
    if ((e.id + world.tick) % 8 === 0) {
      const i = world.idx(e.x | 0, e.y | 0);
      const dirs = [i - 1, i + 1, i - world.w, i + world.w];
      const j = dirs[(Math.random() * 4) | 0];
      if (j >= 0 && j < world.n && Math.abs((j % world.w) - (i % world.w)) <= 1) {
        const tj = world.tiles[j];
        if (TILES[tj].land && tj !== T.METAL && tj !== T.VOID) {
          world.setIdx(j, T.METAL);
          if (world.buildings.has(j)) world.destroyBuilding(j, false);
          let goos = 0; world.near(e.x, e.y, 6, (o) => { if (o.type === 'grey_goo') goos++; });
          if (goos < 12 && world.countEntities((o) => o.type === 'grey_goo') < 80 && Math.random() < 0.35) E.spawn(world, 'grey_goo', (j % world.w) + 0.5, ((j / world.w) | 0) + 0.5);
        }
      }
      world.near(e.x, e.y, 1, (o) => { if (o !== e && o.type !== 'grey_goo' && o.kind !== 'special') E.damage(world, o, 10, 'goo', e); });
    }
  };
  AI.rat = (world, e) => {
    if (!e.hasTarget || (e.id + world.tick) % 100 === 0) { const c = nearestCivCapital(world, e.x, e.y); if (c) { e.tx = c.cx + 0.5; e.ty = c.cy + 0.5; e.hasTarget = true; } }
    if (e.hasTarget) moveToward(world, e, e.tx, e.ty, e.speed); else wander(world, e, 5, null);
    const c = world.civAt(e.x | 0, e.y | 0);
    if (c && c.alive && !c.immune) { MB.Civs.plague(world, c, 0.25); E.kill(world, e, 'spread'); }
  };
  AI.locust = (world, e) => {
    if (!e.hasTarget || e.timer <= 0) {
      let fx = -1, fy = -1;
      world.forRadius(e.x, e.y, 12, (x, y, i) => { if (fx < 0 && (world.tiles[i] === T.FARM || world.tiles[i] === T.GRASS && Math.random() < 0.02)) { fx = x; fy = y; } });
      if (fx >= 0) { e.tx = fx + 0.5; e.ty = fy + 0.5; e.hasTarget = true; e.timer = 200; } else pickWander(world, e, 10);
    }
    e.timer--;
    if (e.hasTarget && moveToward(world, e, e.tx, e.ty, e.speed)) e.hasTarget = false;
    if ((e.id + world.tick) % 10 === 0) {
      const i = world.idx(e.x | 0, e.y | 0);
      if (world.tiles[i] === T.FARM) { world.setIdx(i, T.MUD); const c = world.civAt(e.x | 0, e.y | 0); if (c) c.food = Math.max(0, c.food - 10); }
      else if (world.tiles[i] === T.GRASS && Math.random() < 0.3) world.setIdx(i, T.SAVANNA);
    }
  };
  AI.pirate = (world, e) => {
    if (e.cd > 0) e.cd--;
    if ((e.id + world.tick) % 15 === 0) {
      const t = world.nearest(e.x, e.y, 8, (o) => !o.dead && (o.type === 'boat' || o.type === 'fishing_boat' || o.type === 'warship' || (o.kind === 'human' && o.habitat === 'land')));
      e.target = t ? t.id : 0;
      if (!t && !e.hasTarget) {
        const b = nearestBuilding(world, e.x, e.y, 14);
        if (b) { let wx = -1, wy = -1, bd = Infinity; world.forRadius(b.x, b.y, 3, (x, y, i, dd) => { if (TILES[world.tiles[i]].water && dd < bd) { bd = dd; wx = x; wy = y; } }); if (wx >= 0) { e.tx = wx + 0.5; e.ty = wy + 0.5; e.hasTarget = true; e.timer = 400; e.bTarget = b.i; } }
      }
    }
    const t = findById(world, e.target);
    if (t) { if (U.dist(e.x, e.y, t.x, t.y) > 3) moveToward(world, e, t.x, t.y, e.speed); if (e.cd <= 0 && U.dist(e.x, e.y, t.x, t.y) < 5) { e.cd = 45; MB.lib.fireProjectile(world, e, t.x, t.y, 'cannon', e.dmg); } return; }
    if (e.hasTarget) {
      const arrived = moveToward(world, e, e.tx, e.ty, e.speed); e.timer--;
      if (arrived || e.blocked > 10) {
        const b = world.buildings.get(e.bTarget);
        if (b && e.cd <= 0) { e.cd = 45; MB.lib.fireProjectile(world, e, b.x + 0.5, b.y + 0.5, 'cannon', 40); const c = world.civs[b.civ]; if (c) { c.gold = Math.max(0, c.gold - 15); e.data.loot = (e.data.loot || 0) + 15; } }
        if (!b || e.timer <= 0) e.hasTarget = false;
      }
      return;
    }
    wander(world, e, 10, null);
  };
  AI.elemental = (world, e) => {
    const el = e.def.element;
    if (el === 'fire') { AI.monster(world, e); if ((e.id + world.tick) % 4 === 0) { const i = world.idx(e.x | 0, e.y | 0); if (TILES[world.tiles[i]].flam > 0) world.ignite(i, 120); } return; }
    wander(world, e, 8, null);
    if ((e.id + world.tick) % 6 !== 0) return;
    const i = world.idx(e.x | 0, e.y | 0);
    if (el === 'water') { world.forRadius(e.x, e.y, 2, (x, y, j) => { world.moist[j] = Math.min(255, world.moist[j] + 30); world.extinguish(j); if (world.tiles[j] === T.LAVA) world.setIdx(j, T.OBSIDIAN); if (world.poll[j]) world.poll[j] = Math.max(0, world.poll[j] - 10); }); }
    else if (el === 'earth') { const t = world.tiles[i]; if ((t === T.GRASS || t === T.SAVANNA || t === T.SAND) && Math.random() < 0.3 && !world.buildings.has(i) && world.owner[i] < 0) { world.setIdx(i, T.HILLS); world.height[i] = Math.min(255, world.height[i] + 30); } }
    else if (el === 'air') { world.near(e.x, e.y, 2, (o) => { if (o !== e && o.kind !== 'special' && o.habitat !== 'water') { o.vx += U.rfloat(-0.3, 0.3); o.vy += U.rfloat(-0.3, 0.3); } }); if (Math.random() < 0.3) MB.fx.puff(e.x, e.y, '#e0ffff', 2); }
  };
  AI.spawner = (world, e) => {
    if (e.def.moves) wander(world, e, 15, null, 1);
    e.timer++;
    if (e.timer >= e.def.spawnEvery) {
      e.timer = 0;
      let cnt = 0; world.near(e.x, e.y, 12, (o) => { if (o.type === e.def.spawnType) cnt++; });
      if (cnt < e.def.spawnMax) { const s = E.spawn(world, e.def.spawnType, e.x + U.rfloat(-1, 1), e.y + U.rfloat(-1, 1)); if (s) { s.home = { x: e.x, y: e.y }; MB.fx.puff(s.x, s.y, '#7b2cbf', 4); } }
    }
    if (e.def.moves && e.cd <= 0 && (e.id + world.tick) % 20 === 0) { const b = nearestBuilding(world, e.x, e.y, 4); if (b) { e.cd = 60; MB.fx.beam(e.x, e.y, b.x + 0.5, b.y + 0.5, '#9fff5f'); damageBuilding(world, b, 80, e.type); } }
    if (e.cd > 0) e.cd--;
  };

  // ---------- mythic / good ----------
  AI.healer = (world, e) => {
    wander(world, e, 7, e.home);
    if ((e.id + world.tick) % 10 === 0) {
      const r = e.def.healR || 3;
      world.near(e.x, e.y, r, (o) => {
        if (o === e || o.dead) return;
        if (o.kind === 'human' || o.kind === 'animal' || o.kind === 'mythic') { if (o.hp < o.maxHp) { E.heal(o, 3); if (Math.random() < 0.2) MB.fx.sparkle(o.x, o.y, '#7fffd4', 2); } }
        if (e.def.calm && (o.kind === 'monster' || o.def.prey)) { o.data.calmed = 60; o.calmed = 60; }
      });
      if (e.def.flowers) { const i = world.idx(e.x | 0, e.y | 0); if (world.tiles[i] === T.GRASS && Math.random() < 0.25) world.setIdx(i, T.FLOWERS); }
      if (e.def.blessTiles) { const i = world.idx(e.x | 0, e.y | 0); if ((world.tiles[i] === T.CORRUPT || world.tiles[i] === T.WASTE) && Math.random() < 0.5) world.setIdx(i, T.GRASS); }
      const c = world.civAt(e.x | 0, e.y | 0); if (c && c.alive) c.happiness = Math.min(100, c.happiness + 0.2);
      if (e.dmg > 0) { const m = nearestMonster(world, e, 2); if (m) attack(world, e, m); }
    }
    if (e.cd > 0) e.cd--;
  };
  AI.guardian = (world, e) => {
    if (e.cd > 0) e.cd--;
    const d = e.def;
    if ((e.id + world.tick) % 8 === 0) {
      let m = nearestMonster(world, e, d.aggroR);
      if (!m && e.civ >= 0) m = nearestEnemy(world, e, d.aggroR);
      if (e.data.rogue) m = world.nearest(e.x, e.y, d.aggroR, (o) => o.kind === 'human' && !o.dead);
      e.target = m ? m.id : 0;
      if (!m && d.healR) world.near(e.x, e.y, d.healR, (o) => { if ((o.kind === 'human' || o.kind === 'animal') && o.hp < o.maxHp) E.heal(o, 2); });
      if (!m && e.hp < e.maxHp) e.hp += 1;
    }
    const m = findById(world, e.target);
    if (m) {
      const dist = U.dist(e.x, e.y, m.x, m.y);
      if (d.ranged && dist < (d.range || 3) + 0.5 && dist > 1) { if (e.cd <= 0) { e.cd = d.atkCd; MB.lib.fireProjectile(world, e, m.x, m.y, 'laser', e.dmg, e); } if (dist < 1.5) fleeFrom(world, e, m, 0.8); else if (dist > d.range) moveToward(world, e, m.x, m.y, e.speed); }
      else { moveToward(world, e, m.x, m.y, e.speed * 1.2); attack(world, e, m); }
      return;
    }
    wander(world, e, 8, e.home);
  };
  AI.planter = (world, e) => {
    if (e.cd > 0) e.cd--;
    if (e.dmg > 0 && (e.id + world.tick) % 10 === 0) { const m = nearestMonster(world, e, e.def.aggroR || 6); e.target = m ? m.id : 0; }
    const m = findById(world, e.target);
    if (m && e.dmg > 0) { moveToward(world, e, m.x, m.y, e.speed * 1.5); attack(world, e, m); return; }
    wander(world, e, 8, e.home);
    if ((e.id + world.tick) % 12 === 0) {
      const i = world.idx(e.x | 0, e.y | 0);
      const t = world.tiles[i];
      const plant = e.def.plant;
      if (world.owner[i] >= 0 && Math.random() < 0.7) return;
      if (plant === T.FOREST && (t === T.GRASS || t === T.SAVANNA || t === T.ASH || t === T.MUD) && Math.random() < 0.5 && !world.buildings.has(i)) world.setIdx(i, T.FOREST);
      else if (plant === T.FLOWERS && t === T.GRASS && Math.random() < 0.5) world.setIdx(i, T.FLOWERS);
      else if (plant === T.MUSHROOM && (t === T.FOREST || t === T.SWAMP || t === T.GRASS) && Math.random() < 0.4) world.setIdx(i, T.MUSHROOM);
      else if (MB.tiles.GROWABLE.has(t) && Math.random() < 0.3) world.setIdx(i, T.GRASS);
    }
  };
  AI.sage = (world, e) => {
    wander(world, e, 6, e.home);
    if ((e.id + world.tick) % 20 === 0) { const c = world.civAt(e.x | 0, e.y | 0); if (c && c.alive) { if (e.def.gives === 'science') c.science += 3; else c.culture += 3; if (Math.random() < 0.2) MB.fx.sparkle(e.x, e.y, '#7fd1ff', 3); } }
  };
  AI.genie = (world, e) => {
    if (!e.hasTarget) { const c = nearestCivCapital(world, e.x, e.y); if (!c) { wander(world, e, 8, null); return; } e.tx = c.cx + 0.5; e.ty = c.cy + 0.5; e.hasTarget = true; e.data.civ = c.id; }
    if (moveToward(world, e, e.tx, e.ty, e.speed)) {
      const c = world.civs[e.data.civ];
      if (c && c.alive) { MB.Civs.grantWish(world, c); }
      MB.fx.sparkle(e.x, e.y, '#00e5ff', 20);
      E.kill(world, e, 'vanished'); e.noFx = true;
    }
  };
  AI.cupid = (world, e) => {
    if (!e.hasTarget) { const alive = world.civs.filter((c) => c.alive); if (alive.length < 1) { wander(world, e, 8, null); return; } const c = U.pick(alive); e.tx = c.cx + 0.5; e.ty = c.cy + 0.5; e.hasTarget = true; e.data.civ = c.id; }
    if (moveToward(world, e, e.tx, e.ty, e.speed)) {
      e.hasTarget = false;
      const c = world.civs[e.data.civ];
      if (c && c.alive) { for (const o of world.civs) if (o.alive && o !== c) MB.Civs.changeRelation(world, c, o, 25); c.happiness = Math.min(100, c.happiness + 10); }
      MB.fx.hearts(e.x, e.y, 12);
      e.data.visits = (e.data.visits || 0) + 1;
      if (e.data.visits > 6) { E.kill(world, e, 'vanished'); e.noFx = true; }
    }
  };
  AI.santa = (world, e) => {
    if (!e.hasTarget) { const alive = world.civs.filter((c) => c.alive && !(e.data.v || []).includes(c.id)); if (!alive.length) { E.kill(world, e, 'vanished'); e.noFx = true; return; } const c = alive[0]; e.tx = c.cx + 0.5; e.ty = c.cy + 0.5; e.hasTarget = true; e.data.civ = c.id; }
    if (moveToward(world, e, e.tx, e.ty, e.speed)) {
      e.hasTarget = false;
      const c = world.civs[e.data.civ];
      if (c && c.alive) { c.gold += 100; c.food += 100; c.happiness = Math.min(100, c.happiness + 20); E.spawn(world, 'gift', c.cx + 0.5 + U.rfloat(-1, 1), c.cy + 0.5 + U.rfloat(-1, 1)); world.addLog(`Santa visited ${c.name}! Ho ho ho!`, 'good', c.cx, c.cy); }
      (e.data.v = e.data.v || []).push(e.data.civ);
      MB.fx.sparkle(e.x, e.y, '#ff0000', 10);
    }
    if (world.tick % 5 === 0) MB.fx.sparkle(e.x, e.y, '#ffd700', 1);
  };
  AI.leprechaun = (world, e) => {
    wander(world, e, 8, null);
    if ((e.id + world.tick) % 30 === 0) { const i = world.idx(e.x | 0, e.y | 0); const c = world.civAt(e.x | 0, e.y | 0); if (c) c.gold += 5; if (world.tiles[i] === T.HILLS && Math.random() < 0.2) world.setIdx(i, T.GOLD); MB.fx.sparkle(e.x, e.y, '#ffd700', 2); }
  };
  AI.cleanser = (world, e) => {
    wander(world, e, 8, null);
    if ((e.id + world.tick) % 6 === 0) world.forRadius(e.x, e.y, 3, (x, y, i) => { if (world.poll[i]) world.poll[i] = Math.max(0, world.poll[i] - 15); if (world.rad[i]) world.rad[i] = Math.max(0, world.rad[i] - 10); if (world.tiles[i] === T.OIL && Math.random() < 0.05) world.setIdx(i, T.SAND); });
  };
  AI.reaper = (world, e) => {
    if (e.cd > 0) e.cd--;
    if (!e.target || (e.id + world.tick) % 20 === 0) { const h = world.nearest(e.x, e.y, 25, (o) => o.kind === 'human' && !o.dead); e.target = h ? h.id : 0; }
    const h = findById(world, e.target);
    if (h) { moveToward(world, e, h.x, h.y, e.speed); if (U.dist(e.x, e.y, h.x, h.y) < 1 && e.cd <= 0) { e.cd = 25; E.kill(world, h, 'reaped', e); MB.fx.puff(h.x, h.y, '#222', 6); const c = h.civ >= 0 ? world.civs[h.civ] : null; if (c) c.happiness -= 2; } return; }
    wander(world, e, 10, null);
  };

  // ---------- special objects ----------
  AI.tornado = (world, e) => {
    if (e.data.dir === undefined) e.data.dir = Math.random() * Math.PI * 2;
    e.data.dir += U.rfloat(-0.25, 0.25);
    const wth = world.weather;
    const nx = e.x + Math.cos(e.data.dir) * e.speed + wth.windX * 0.03, ny = e.y + Math.sin(e.data.dir) * e.speed + wth.windY * 0.03;
    if (nx < 1 || nx > world.w - 1) e.data.dir = Math.PI - e.data.dir; else e.x = nx;
    if (ny < 1 || ny > world.h - 1) e.data.dir = -e.data.dir; else e.y = ny;
    const r = e.r || e.def.r || 2.2;
    world.near(e.x, e.y, r, (o, d) => {
      if (o === e || o.kind === 'special' || o.def.boss || o.immortal) return;
      if (o.type === 'tornado') return;
      const fling = (1 - d / r) * 0.6;
      o.vx += U.rfloat(-fling, fling) * 2; o.vy += U.rfloat(-fling, fling) * 2 - 0.1;
      if (d < r * 0.6) E.damage(world, o, 4, 'tornado');
    });
    if (world.tick % 3 === 0) {
      const i = world.idx(e.x | 0, e.y | 0);
      world.forRadius(e.x, e.y, r * 0.7, (x, y, j) => {
        if (Math.random() > 0.25) return;
        const t = world.tiles[j];
        const b = world.buildings.get(j);
        if (b) damageBuilding(world, b, 18, 'tornado');
        if ((t === T.FOREST || t === T.JUNGLE) && Math.random() < 0.3) world.setIdx(j, T.GRASS);
        else if (t === T.FARM && Math.random() < 0.4) world.setIdx(j, T.GRASS);
        else if (t === T.FLOWERS && Math.random() < 0.4) world.setIdx(j, T.GRASS);
        if (e.def.fire && TILES[t].flam > 0 && Math.random() < 0.4) world.ignite(j, 120);
      });
      if (e.def.sharks && world.tick % 24 === 0) { const s = E.spawn(world, 'shark', e.x, e.y, { force: true, habitat: 'any', life: 400 }); if (s) { s.vx = U.rfloat(-0.8, 0.8); s.vy = U.rfloat(-0.8, 0.8); s.data.flying = true; } }
      if (world.fire[i] && !e.def.fire) world.extinguish(i);
    }
    MB.fx.tornadoFx(e, r);
  };
  AI.cloud = (world, e) => {
    const wth = world.weather;
    e.x = U.clamp(e.x + wth.windX * 0.02 + (e.data.dx || 0), 0.5, world.w - 0.5);
    e.y = U.clamp(e.y + wth.windY * 0.02 + (e.data.dy || 0), 0.5, world.h - 0.5);
    const r = e.r || e.def.r || 6;
    const type = e.cloudType || 'rain';
    if (!world.rainMask) world.rainMask = new Set();
    const wet = type === 'rain' || type === 'storm' || type === 'snow' || type === 'heal' || type === 'fertile' || type === 'monsoon';
    const every5 = world.tick % 5 === 0;
    world.forRadius(e.x, e.y, r, (x, y, i, d) => {
      if (wet) world.rainMask.add(i);
      if (!every5) return;
      const t = world.tiles[i];
      switch (type) {
        case 'rain': case 'monsoon': world.moist[i] = Math.min(255, world.moist[i] + (type === 'monsoon' ? 12 : 5)); if (world.fire[i]) world.fire[i] = Math.max(0, world.fire[i] - 30); if (type === 'monsoon' && (t === T.GRASS || t === T.SAVANNA) && Math.random() < 0.004 && world.height[i] < 140) world.setIdx(i, T.SWAMP); break;
        case 'storm': world.moist[i] = Math.min(255, world.moist[i] + 5); break;
        case 'snow': world.moist[i] = Math.min(255, world.moist[i] + 2); if (Math.random() < 0.01) { if (TILES[t].water && t !== T.DEEP) world.setIdx(i, T.FROZEN); else if (t === T.GRASS || t === T.SAVANNA || t === T.FLOWERS) world.setIdx(i, T.SNOW); } if (world.fire[i]) world.extinguish(i); break;
        case 'acid': if (Math.random() < 0.01) { if (t === T.GRASS || t === T.FLOWERS) world.setIdx(i, T.SAVANNA); else if (t === T.FOREST || t === T.JUNGLE) world.setIdx(i, T.GRASS); else if (t === T.FARM) world.setIdx(i, T.MUD); } world.poll[i] = Math.min(255, world.poll[i] + 1); break;
        case 'blood': if (Math.random() < 0.0015 && TILES[t].land) E.spawn(world, 'zombie', x + 0.5, y + 0.5); if (Math.random() < 0.002 && TILES[t].land) world.setIdx(i, T.CORRUPT); break;
        case 'fish': if (Math.random() < 0.004 && TILES[t].land) { const f = E.spawn(world, 'fish', x + 0.5, y + 0.5, { force: true, habitat: 'any', life: 200 }); if (f) f.data.flop = true; const c = world.civAt(x, y); if (c) c.food += 3; } break;
        case 'frog': if (Math.random() < 0.003 && TILES[t].land) E.spawn(world, 'frog', x + 0.5, y + 0.5, { force: true, habitat: 'amph' }); break;
        case 'candy': if (Math.random() < 0.003 && TILES[t].land && TILES[t].build) world.setIdx(i, T.CANDY); break;
        case 'gold': if (Math.random() < 0.004) { const c = world.civAt(x, y); if (c) c.gold += 4; if (Math.random() < 0.3 && t === T.HILLS) world.setIdx(i, T.GOLD); } break;
        case 'lava': if (Math.random() < 0.003 && TILES[t].land) { world.setIdx(i, T.LAVA); } else if (Math.random() < 0.004 && TILES[t].flam > 0) world.ignite(i, 120); break;
        case 'meteor': if (Math.random() < 0.0006) E.spawn(world, 'meteor', x + 0.5, y - 25, { ttx: x + 0.5, tty: y + 0.5, power: 1.5 }); break;
        case 'locust': if (t === T.FARM && Math.random() < 0.02) { world.setIdx(i, T.MUD); const c = world.civAt(x, y); if (c) c.food = Math.max(0, c.food - 5); } break;
        case 'pollen': if (t === T.GRASS && Math.random() < 0.01) world.setIdx(i, T.FLOWERS); break;
        case 'fertile': world.moist[i] = Math.min(255, world.moist[i] + 8); if (MB.tiles.GROWABLE.has(t) && Math.random() < 0.01) world.setIdx(i, T.GRASS); else if (t === T.GRASS && Math.random() < 0.002) world.setIdx(i, T.FOREST); break;
        case 'ash': if (Math.random() < 0.004 && (t === T.GRASS || t === T.FLOWERS || t === T.FARM)) world.setIdx(i, T.ASH); world.poll[i] = Math.min(255, world.poll[i] + 1); break;
        case 'fallout': world.rad[i] = Math.min(255, world.rad[i] + 2); break;
        case 'heal': break;
        case 'poison': if (Math.random() < 0.004 && (t === T.GRASS || t === T.FOREST || t === T.FARM)) world.setIdx(i, T.WASTE); break;
        case 'confetti': break;
        case 'cow': if (Math.random() < 0.0015 && TILES[t].land && TILES[t].walk) { const c = E.spawn(world, 'cow', x + 0.5, y + 0.5); if (c) { c.vy = -0.3; } } break;
        case 'money': if (Math.random() < 0.004) { const c = world.civAt(x, y); if (c) c.gold += 6; } break;
        case 'freeze': if (Math.random() < 0.02) { if (TILES[t].water) world.setIdx(i, T.FROZEN); else if (t === T.LAVA) world.setIdx(i, T.OBSIDIAN); else if (TILES[t].land && t !== T.ICE && t !== T.SNOW && t !== T.MOUNTAIN && Math.random() < 0.3) world.setIdx(i, T.SNOW); } break;
        case 'void': if (Math.random() < 0.002 && TILES[t].land) world.setIdx(i, T.VOID); break;
        case 'rainbow': break;
        case 'pizza': if (Math.random() < 0.003) { const c = world.civAt(x, y); if (c) { c.food += 8; c.happiness = Math.min(100, c.happiness + 0.5); } } break;
      }
    });
    if (every5) {
      if (type === 'heal') world.near(e.x, e.y, r, (o) => { if (o.kind !== 'monster' && o.kind !== 'special') E.heal(o, 2); });
      if (type === 'acid' || type === 'poison') world.near(e.x, e.y, r, (o) => { if (o.kind !== 'special' && o.habitat !== 'water' && Math.random() < 0.3) E.damage(world, o, type === 'poison' ? 3 : 1, type); });
      if (type === 'fallout') world.near(e.x, e.y, r, (o) => { if (o.kind !== 'special' && Math.random() < 0.3) E.damage(world, o, 2, 'radiation'); });
      if (type === 'confetti' || type === 'rainbow') { const c = world.civAt(e.x | 0, e.y | 0); if (c) c.happiness = Math.min(100, c.happiness + 1); }
      if (type === 'storm' && world.tick % 40 === 0) { const a = Math.random() * Math.PI * 2, d = Math.random() * r; const lx = U.clamp((e.x + Math.cos(a) * d) | 0, 0, world.w - 1), ly = U.clamp((e.y + Math.sin(a) * d) | 0, 0, world.h - 1); world.lightningStrike(lx, ly, 1); }
      if (type === 'frog' || type === 'fish' || type === 'cow') { /* already spawned above */ }
    }
    MB.fx.cloudFx(e, r, type);
  };
  AI.meteor = (world, e) => {
    if (e.ttx === undefined) { e.ttx = e.x; e.tty = e.y + 25; }
    const arrived = moveToward(world, e, e.ttx, e.tty, e.speed);
    MB.fx.trail(e.x, e.y, e.data.ice ? '#a0e9ff' : '#ff8c00');
    if (arrived) {
      e.dead = true;
      const p = e.power || 3;
      if (e.data.ice) MB.lib.freeze(world, e.x, e.y, p * 2.5);
      else MB.lib.explode(world, e.x, e.y, { r: p * 1.6, power: p * 40, crater: true, fire: 0.3, cause: e.data.cause || 'meteor' });
      if (p >= 6) world.addLog('A massive asteroid impact shakes the world!', 'disaster', e.x, e.y);
    }
  };
  AI.bomb = (world, e) => {
    if (e.fuse === undefined) e.fuse = e.def.fuse || 60;
    e.fuse--;
    if (e.fuse % 10 === 0) MB.fx.spark(e.x, e.y - 0.4);
    if (e.fuse <= 0) {
      e.dead = true;
      const o = e.data.explode || { r: 3, power: 60, fire: 0.3 };
      MB.lib.explode(world, e.x, e.y, Object.assign({ cause: 'player' }, o));
      if (o.chain) for (let k = 0; k < o.chain; k++) E.spawn(world, 'bomb', e.x + U.rfloat(-4, 4), e.y + U.rfloat(-4, 4), { fuse: U.rint(10, 40), data: { explode: { r: 2, power: 40, fire: 0.3 } } });
    }
  };
  AI.missile = (world, e) => {
    if (e.ttx === undefined) { e.dead = true; return; }
    const arrived = moveToward(world, e, e.ttx, e.tty, e.speed);
    MB.fx.trail(e.x, e.y, '#ccc');
    if (arrived) { e.dead = true; MB.lib.explode(world, e.x, e.y, Object.assign({ cause: 'player' }, e.data.explode || { r: 4, power: 80, fire: 0.3 })); }
  };
  AI.blackhole = (world, e) => {
    const r = e.r || 1.5;
    const pull = r * 5;
    world.near(e.x, e.y, pull, (o, d) => {
      if (o === e || o.type === 'blackhole') return;
      const f = (1 - d / pull) * 0.12;
      const dx = e.x - o.x, dy = e.y - o.y, dd = d || 0.01;
      o.vx += (dx / dd) * f; o.vy += (dy / dd) * f;
      if (d < r * 0.5) { E.kill(world, o, 'void'); o.noFx = true; e.r = Math.min(8, (e.r || 1.5) + 0.03); }
    });
    if (world.tick % 4 === 0) {
      world.forRadius(e.x, e.y, r, (x, y, i, d) => {
        const b = world.buildings.get(i); if (b) damageBuilding(world, b, 50, 'void');
        if (d < r * 0.6 && TILES[world.tiles[i]].land && Math.random() < 0.3) world.setIdx(i, T.VOID);
      });
    }
    e.onDie = (w, ee) => { w.forRadius(ee.x, ee.y, (ee.r || 1.5) + 1, (x, y, i) => { if (w.tiles[i] === T.VOID) w.setIdx(i, T.CRATER); }); };
    MB.fx.blackholeFx(e, r);
  };
  AI.portal = (world, e) => {
    if (!e.data.pair) return;
    const pair = findById(world, e.data.pair);
    if (!pair) { E.kill(world, e, 'closed'); e.noFx = true; return; }
    world.near(e.x, e.y, 0.9, (o) => {
      if (o.kind === 'special' || (o.portalCd && o.portalCd > 0)) return;
      o.x = pair.x + U.rfloat(-0.5, 0.5); o.y = pair.y + U.rfloat(-0.5, 0.5); o.portalCd = 60; o.hasTarget = false;
      MB.fx.sparkle(pair.x, pair.y, '#c77dff', 4);
    });
    if (world.tick % 6 === 0) MB.fx.sparkle(e.x, e.y, '#c77dff', 1);
  };
  AI.shield = (world, e) => {
    const r = e.r || e.def.r || 6;
    (world.shields = world.shields || []).push({ x: e.x, y: e.y, r });
    world.forRadius(e.x, e.y, r, (x, y, i) => { const b = world.buildings.get(i); if (b) b.shielded = world.tick; if (world.fire[i]) world.extinguish(i); });
    world.near(e.x, e.y, r + 0.5, (o, d) => { if (o.kind === 'monster' && d > r - 1) { const dx = o.x - e.x, dy = o.y - e.y, dd = d || 0.01; o.x = e.x + (dx / dd) * (r + 0.6); o.y = e.y + (dy / dd) * (r + 0.6); } });
    MB.fx.shieldFx(e, r);
  };
  AI.ufo = (world, e) => {
    if (e.cd > 0) e.cd--;
    wander(world, e, 10, null);
    if ((e.id + world.tick) % 15 === 0 && e.cd <= 0) {
      const t = world.nearest(e.x, e.y, 2.5, (o) => (o.kind === 'human' || o.def.livestock) && !o.dead);
      if (t) { e.cd = 60; MB.fx.beam(e.x, e.y, t.x, t.y, '#9fff5f'); E.kill(world, t, 'abducted', e); t.noFx = true; e.data.abducted = (e.data.abducted || 0) + 1; if (t.civ >= 0 && world.civs[t.civ] && Math.random() < 0.3) world.addLog(`A UFO abducted ${t.name || 'someone'} from ${world.civs[t.civ].name}!`, 'disaster', t.x, t.y); }
      else if (Math.random() < 0.2) { const b = nearestBuilding(world, e.x, e.y, 3); if (b) { e.cd = 80; MB.fx.beam(e.x, e.y, b.x + 0.5, b.y + 0.5, '#ff5f5f'); damageBuilding(world, b, 70, 'ufo'); } }
    }
  };
  AI.turret = (world, e) => {
    if (e.cd > 0) { e.cd--; return; }
    if ((e.id + world.tick) % 5 !== 0) return;
    let m = nearestMonster(world, e, e.def.range);
    if (!m && e.civ >= 0) m = nearestEnemy(world, e, e.def.range);
    if (m) { e.cd = 20; MB.fx.beam(e.x, e.y - 0.3, m.x, m.y, '#ff3b3b'); E.damage(world, m, e.dmg, 'laser', e); }
  };
  AI.nanobots = (world, e) => {
    wander(world, e, 4, e.home);
    if ((e.id + world.tick) % 8 === 0) {
      world.forRadius(e.x, e.y, 3, (x, y, i) => { const b = world.buildings.get(i); if (b && b.hp < b.maxHp) b.hp = Math.min(b.maxHp, b.hp + 5); if (world.rad[i]) world.rad[i] = Math.max(0, world.rad[i] - 5); if (world.poll[i]) world.poll[i] = Math.max(0, world.poll[i] - 5); if (world.tiles[i] === T.RUINS && Math.random() < 0.05) world.setIdx(i, T.GRASS); });
      world.near(e.x, e.y, 3, (o) => { if (o.kind !== 'monster' && o.kind !== 'special') E.heal(o, 2); });
    }
  };
  AI.balloon = (world, e) => { e.y -= 0.01; e.x += world.weather.windX * 0.03; if (e.age >= e.life - 1) MB.fx.puff(e.x, e.y, '#e63946', 4); };
  AI.firework = (world, e) => {
    e.y -= e.speed; MB.fx.spark(e.x, e.y + 0.3);
    if (e.age >= e.life - 1) { MB.fx.fireworkBurst(e.x, e.y, e.data.color || U.hslToHex(Math.random() * 360, 1, 0.6)); world.near(e.x, e.y, 10, (o) => { if (o.kind === 'human' && o.civ >= 0 && world.civs[o.civ]) world.civs[o.civ].happiness = Math.min(100, world.civs[o.civ].happiness + 0.05); }); }
  };
  AI.rocket = (world, e) => {
    e.y -= e.speed * (1 + e.age / 60); MB.fx.trail(e.x, e.y + 0.6, '#ff8c00'); MB.fx.smoke(e.x, e.y + 0.8, 1);
    if (e.y < -5 || e.age >= e.life - 1) { e.dead = true; if (e.civ >= 0 && world.civs[e.civ]) { const c = world.civs[e.civ]; c.spaceLaunches = (c.spaceLaunches || 0) + 1; c.science += 200; c.happiness = Math.min(100, c.happiness + 15); world.addLog(`${c.name} launched a rocket into space!`, 'good', c.cx, c.cy); } }
  };
  AI.mine = (world, e) => {
    if ((e.id + world.tick) % 3 !== 0) return;
    const t = world.nearest(e.x, e.y, 0.7, (o) => o !== e && o.kind !== 'special' && o.habitat !== 'air');
    if (t) { e.dead = true; MB.lib.explode(world, e.x, e.y, { r: 2 * (e.power || 1), power: 50 * (e.power || 1), fire: 0.2, cause: 'player' }); }
  };
  AI.static = (world, e) => {
    const r = e.def.r || 5;
    const ef = e.def.effect;
    switch (ef) {
      case 'repel': (world.repelPoints = world.repelPoints || []).push({ x: e.x, y: e.y, r }); break;
      case 'shield': (world.shields = world.shields || []).push({ x: e.x, y: e.y, r }); if (world.tick % 2 === 0) world.forRadius(e.x, e.y, r, (x, y, i) => { const b = world.buildings.get(i); if (b) b.shielded = world.tick; }); MB.fx.shieldFx(e, r); break;
      case 'happy': if (world.tick % 40 === 0) { const c = world.civAt(e.x | 0, e.y | 0); if (c) { c.happiness = Math.min(100, c.happiness + 0.5); c.culture += 1; } } break;
      case 'science': if (world.tick % 40 === 0) { const c = world.civAt(e.x | 0, e.y | 0); if (c) c.science += 2; if (Math.random() < 0.3) MB.fx.sparkle(e.x, e.y - 0.5, '#7fd1ff', 1); } break;
      case 'camp': if (world.tick % 20 === 0) { world.near(e.x, e.y, r, (o) => { if (o.kind === 'human' || o.kind === 'animal') E.heal(o, 1); if (o.kind === 'human' && o.civ < 0 && Math.random() < 0.3) { o.tx = e.x + U.rfloat(-1.5, 1.5); o.ty = e.y + U.rfloat(-1.5, 1.5); o.hasTarget = true; o.timer = 100; } }); MB.fx.ember(e.x + U.rfloat(-0.2, 0.2), e.y - 0.2); } break;
      case 'rod': if (world.weather.type === 'storm' && world.tick % 60 === 0 && Math.random() < 0.5) { MB.fx.lightning(e.x | 0, e.y | 0); const c = world.civAt(e.x | 0, e.y | 0); if (c) c.science += 5; } break;
      case 'terraform': if (world.tick % 10 === 0) { const a = Math.random() * Math.PI * 2, d = Math.random() * r; const x = (e.x + Math.cos(a) * d) | 0, y = (e.y + Math.sin(a) * d) | 0; if (world.inb(x, y)) { const i = world.idx(x, y), t = world.tiles[i]; if (MB.tiles.GROWABLE.has(t) || t === T.MOON || t === T.GLASS || t === T.OBSIDIAN) world.setIdx(i, T.GRASS); else if (TILES[t].water && t !== T.DEEP && Math.random() < 0.1 && d < r * 0.6) { world.setIdx(i, T.SAND); world.height[i] = 132; } world.rad[i] = 0; world.poll[i] = 0; } } break;
      case 'weather': if (world.tick % 5 === 0) { if (!world.rainMask) world.rainMask = new Set(); world.forRadius(e.x, e.y, r, (x, y, i) => { world.rainMask.add(i); world.moist[i] = Math.min(255, world.moist[i] + 3); }); MB.fx.cloudFx(e, r, 'rain'); } break;
      case 'well': if (world.tick % 10 === 0) world.forRadius(e.x, e.y, r, (x, y, i) => { world.moist[i] = Math.min(255, world.moist[i] + 4); if (world.fire[i]) world.extinguish(i); }); break;
      case 'scare': (world.repelPoints = world.repelPoints || []).push({ x: e.x, y: e.y, r }); if (world.tick % 20 === 0) world.near(e.x, e.y, r, (o) => { if (o.type === 'bird' || o.type === 'locust_swarm' || o.type === 'rat' || o.type === 'plague_rat') { o.fleeing = e; o.fleeT = 40; } }); break;
      case 'beacon': if (world.tick % 30 === 0) { world.near(e.x, e.y, r, (o) => { if (o.kind === 'animal' && Math.random() < 0.3) { o.tx = e.x + U.rfloat(-2, 2); o.ty = e.y + U.rfloat(-2, 2); o.hasTarget = true; o.timer = 100; } }); MB.fx.sparkle(e.x, e.y - 0.5, '#00e5ff', 1); } break;
    }
  };
  AI.hatch = (world, e) => {
    if (e.age >= e.life - 1) {
      let type = e.def.hatch;
      if (type === 'random') type = U.pick(['dragon', 'unicorn', 'griffin', 'phoenix', 'chicken', 'kaiju', 'slime_king', 'pegasus', 'basilisk', 'hydra', 'dodo']);
      E.spawn(world, type, e.x, e.y, { force: true });
      MB.fx.sparkle(e.x, e.y, '#ffd700', 10);
    }
    if (e.age > e.life - 60 && world.tick % 5 === 0) e.x += U.rfloat(-0.03, 0.03);
  };
  AI.projectile = (world, e) => {
    const arrived = moveToward(world, e, e.ttx, e.tty, e.speed);
    if (e.data.kind === 'fireball' || e.data.kind === 'laser') MB.fx.trail(e.x, e.y, e.data.kind === 'laser' ? '#ff3b3b' : '#ff8c00');
    if (arrived || e.age > 120) {
      e.dead = true;
      const k = e.data.kind;
      const r = k === 'cannon' ? 1.2 : k === 'fireball' ? 1.3 : 0.8;
      const owner = e.data.owner;
      world.near(e.x, e.y, r, (o) => {
        if (o.kind === 'special') return;
        if (owner != null) { if (o.id === owner.id) return; if (owner.civ >= 0 && o.civ === owner.civ) return; if (owner.kind === 'monster' && o.kind === 'monster') return; if ((owner.kind === 'human' || owner.kind === 'mythic') && (o.kind === 'human' || o.kind === 'mythic') && !(o.civ >= 0 && owner.civ >= 0 && world.civs[owner.civ] && world.civs[owner.civ].wars[o.civ]) && !o.def.hostile) return; }
        E.damage(world, o, e.dmg, k, owner);
      });
      const i = world.idx(U.clamp(e.x | 0, 0, world.w - 1), U.clamp(e.y | 0, 0, world.h - 1));
      if (k === 'fireball' && TILES[world.tiles[i]].flam > 0 && Math.random() < 0.5) world.ignite(i, 100);
      if (k === 'cannon') { const b = world.buildings.get(i); if (b && !(owner && owner.civ === b.civ)) damageBuilding(world, b, e.dmg, 'cannon'); MB.fx.explosion(e.x, e.y, 0.8, '#aaa'); }
      else MB.fx.hit(e.x, e.y);
    }
  };
  AI.orbit = (world, e) => {
    e.x += e.speed; if (e.x > world.w + 2) e.x = -2;
    if (world.tick % 100 === 0) for (const c of world.civs) if (c.alive && c.era >= 6) c.science += 2;
  };
  AI.gift = (world, e) => {
    if (world.tick % 20 === 0) MB.fx.sparkle(e.x, e.y, '#ffd700', 1);
    const h = world.nearest(e.x, e.y, 0.8, (o) => o.kind === 'human');
    if (h) { e.dead = true; const c = h.civ >= 0 ? world.civs[h.civ] : null; if (c) { c.gold += 50; c.happiness = Math.min(100, c.happiness + 5); } MB.fx.sparkle(e.x, e.y, '#ff0000', 8); }
  };

  // ---------- main update ----------
  function updateAll(world, game) {
    const ents = world.entities;
    world.rainMask = null;
    world.shields = null;
    world.repelPoints = null;
    const lowG = world.flags.lowGravity;
    for (let k = 0; k < ents.length; k++) {
      const e = ents[k];
      if (e.dead) continue;
      if (!isFinite(e.x) || !isFinite(e.y)) { e.dead = true; continue; }
      e.age++;
      if (e.flash > 0) e.flash--;
      if (e.portalCd > 0) e.portalCd--;
      if (e.life && e.age >= e.life) { if (e.def.ai === 'hatch' || e.def.ai === 'firework' || e.def.ai === 'balloon') AI[e.def.ai](world, e); E.kill(world, e, 'age'); e.noFx = true; continue; }
      if (world.flags.timeFrozen && e.kind !== 'special') continue;
      if (e.frozen > 0) { e.frozen--; continue; }
      if (e.vx || e.vy) {
        e.x = U.clamp(e.x + e.vx, 0.05, world.w - 0.05); e.y = U.clamp(e.y + e.vy, 0.05, world.h - 0.05);
        const f = lowG ? 0.96 : 0.86;
        e.vx *= f; e.vy *= f;
        if (Math.abs(e.vx) < 0.004) e.vx = 0; if (Math.abs(e.vy) < 0.004) e.vy = 0;
        if (e.data.flying && Math.abs(e.vx) + Math.abs(e.vy) < 0.05) { e.data.flying = false; e.habitat = e.def.habitat; }
      }
      if (((e.id + world.tick) & 7) === 0) hazards(world, e);
      if (e.dead) continue;
      const fn = AI[e.def.ai];
      if (fn) fn(world, e, game);
    }
    const sh = world.shields;
    world.isShielded = sh ? (x, y) => { for (const s of sh) if (U.dist(x, y, s.x, s.y) <= s.r) return true; return false; } : null;
  }

  MB.Entities.updateAll = updateAll;
  MB.AIhelpers = { nearestBuilding, nearestCivCapital, damageBuilding };
})();
