'use strict';
// MineBomb - entity AI (core behaviors: movement, animals, humans, soldiers)
(function () {
  const U = MB.util, T = MB.T, TILES = MB.TILES;
  const E = MB.Entities;
  const AI = {};

  // ---------- movement helpers ----------
  function moveToward(world, e, tx, ty, sp) {
    const dx = tx - e.x, dy = ty - e.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.02) return true;
    const step = Math.min(sp, d);
    const nx = e.x + (dx / d) * step, ny = e.y + (dy / d) * step;
    if (dx !== 0) e.flip = dx < 0;
    if (E.canStand(world, e, nx, ny)) { e.x = nx; e.y = ny; e.blocked = 0; return d <= sp; }
    if (E.canStand(world, e, nx, e.y)) { e.x = nx; return false; }
    if (E.canStand(world, e, e.x, ny)) { e.y = ny; return false; }
    // slide perpendicular
    const px = -dy / d, py = dx / d;
    const s = e.id % 2 ? 1 : -1;
    if (E.canStand(world, e, e.x + px * step * s, e.y + py * step * s)) { e.x += px * step * s; e.y += py * step * s; }
    e.blocked++;
    return false;
  }
  function pickWander(world, e, r) {
    for (let k = 0; k < 6; k++) {
      const a = Math.random() * Math.PI * 2, d = Math.random() * r + 0.5;
      const tx = e.x + Math.cos(a) * d, ty = e.y + Math.sin(a) * d;
      if (E.canStand(world, e, tx, ty)) { e.tx = tx; e.ty = ty; e.hasTarget = true; return true; }
    }
    e.hasTarget = false;
    return false;
  }
  function wander(world, e, r, home, spMul = 1) {
    if (!e.hasTarget || e.timer <= 0 || e.blocked > 4) {
      e.blocked = 0;
      if (home && U.dist(e.x, e.y, home.x, home.y) > r * 1.6) {
        e.tx = home.x + U.rfloat(-1.5, 1.5); e.ty = home.y + U.rfloat(-1.5, 1.5); e.hasTarget = true;
      } else pickWander(world, e, r);
      e.timer = U.rint(40, 180);
    }
    e.timer--;
    if (e.hasTarget) { if (moveToward(world, e, e.tx, e.ty, e.speed * spMul)) e.hasTarget = false; }
  }
  function fleeFrom(world, e, o, spMul = 1.2) {
    const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy) || 0.01;
    const tx = e.x + (dx / d) * 3, ty = e.y + (dy / d) * 3;
    moveToward(world, e, tx, ty, e.speed * spMul);
    e.hasTarget = false;
  }
  function findById(world, id) {
    if (!id) return null;
    const ents = world.entities;
    for (let i = 0; i < ents.length; i++) if (ents[i].id === id) return ents[i].dead ? null : ents[i];
    return null;
  }
  function attack(world, e, o, mult = 1) {
    if (e.cd > 0) return false;
    const d = U.dist(e.x, e.y, o.x, o.y);
    const range = e.def.range || 1.1;
    if (d <= range + (o.scale > 1 ? o.scale * 0.4 : 0)) {
      e.cd = e.def.atkCd;
      if (e.def.ranged && d > 1.2) MB.fx.shot(e.x, e.y, o.x, o.y, e.def.ranged);
      else MB.fx.hit(o.x, o.y);
      E.damage(world, o, e.dmg * mult, e.type, e);
      return true;
    }
    return false;
  }
  function isEnemyOf(world, e, o) {
    if (o === e || o.dead) return false;
    if (o.def.hostile && !e.def.hostile) return true;
    if (e.def.hostile && !o.def.hostile && (o.kind === 'human' || o.kind === 'mythic')) return true;
    if (e.civ >= 0 && o.civ >= 0 && e.civ !== o.civ) {
      const c = world.civs[e.civ];
      if (c && c.wars[o.civ]) return true;
    }
    return false;
  }
  function nearestEnemy(world, e, r) {
    return world.nearest(e.x, e.y, r, (o) => isEnemyOf(world, e, o) && o.kind !== 'special' && !o.def.ethereal);
  }
  function nearestMonster(world, e, r) {
    return world.nearest(e.x, e.y, r, (o) => o.kind === 'monster' && !o.dead && o !== e && (!o.def.ethereal || e.def.holy));
  }
  function threatNear(world, e, r) {
    return world.nearest(e.x, e.y, r, (o) => o !== e && !o.dead && ((o.kind === 'monster' && o.def.dmg > 0) || (o.kind === 'animal' && o.def.prey && o.def.prey.includes(e.type)) || (e.civ >= 0 && o.civ >= 0 && o.civ !== e.civ && o.type === 'soldier' && world.civs[e.civ] && world.civs[e.civ].wars[o.civ])));
  }

  // ---------- hazards ----------
  function hazards(world, e) {
    const xi = e.x | 0, yi = e.y | 0;
    if (xi < 0 || yi < 0 || xi >= world.w || yi >= world.h) { e.x = U.clamp(e.x, 0.1, world.w - 0.1); e.y = U.clamp(e.y, 0.1, world.h - 0.1); return; }
    const i = yi * world.w + xi;
    const t = world.tiles[i], td = TILES[t];
    if (e.habitat !== 'air' && !e.def.ethereal) {
      if (world.fire[i] && !e.fireproof) E.damage(world, e, 8, 'fire');
      if (td.hot && !e.fireproof) E.damage(world, e, 20, 'lava');
      if (td.water && e.habitat === 'land') E.damage(world, e, 4, 'drowning');
      if (!td.water && e.habitat === 'water') E.damage(world, e, 3, 'stranded');
      if (t === T.TAR && e.habitat === 'land') e.slow = 10;
      if (t === T.VOID) E.damage(world, e, 60, 'void');
      if (t === T.HOLY && e.kind === 'monster' && !e.def.holy) E.damage(world, e, 5, 'holy');
      if (t === T.CORRUPT && e.kind === 'human' && Math.random() < 0.15) E.damage(world, e, 1, 'corruption');
    }
    if (world.rad[i] > 50 && !e.def.radproof && e.kind !== 'special') {
      if (Math.random() < 0.5) E.damage(world, e, 1 + world.rad[i] / 100, 'radiation');
      if (e.kind === 'animal' && Math.random() < 0.004) mutate(world, e);
      else if (e.kind === 'human' && Math.random() < 0.001) mutate(world, e);
    }
    if (e.def.melts && world.tempAt(xi, yi) > 0.55 && world.seasonIndex() !== 3 && Math.random() < 0.1) E.damage(world, e, 2, 'heat');
    if (e.def.nocturnal && world.daylight() > 0.7 && e.type === 'vampire' && !e.def.ethereal) E.damage(world, e, 3, 'sunlight');
    // livestock feed civs
    if (e.def.livestock && world.owner[i] >= 0 && Math.random() < 0.1) { const c = world.civs[world.owner[i]]; if (c && c.alive) { c.food += 1.5; c.livestockNear = world.tick; } }
  }
  function mutate(world, e) {
    const map = { cow: 'mutant_cow', chicken: 'zombie_chicken', human: 'zombie', rat: 'plague_rat', spider: 'giant_spider', scorpion: 'giant_scorpion', slime: 'abomination' };
    const nt = map[e.type] || 'abomination';
    E.kill(world, e, 'mutation');
    E.spawn(world, nt, e.x, e.y, { force: true });
    MB.fx.puff(e.x, e.y, '#9acd32', 8);
  }

  // ---------- animals ----------
  AI.wander = (world, e) => wander(world, e, e.def.wanderR || 6, null);
  AI.herb = (world, e) => {
    if ((e.id + world.tick) % 6 === 0) {
      const th = threatNear(world, e, 5);
      if (th) { e.fleeing = th.id; e.fleeT = 40; }
    }
    if (e.fleeT > 0) {
      e.fleeT--;
      const th = findById(world, e.fleeing);
      if (th) { fleeFrom(world, e, th); return; }
    }
    if (e.calmed) e.calmed--;
    wander(world, e, e.def.wanderR || 5, e.home, e.slow ? 0.5 : 1);
    if (e.slow) e.slow--;
    breed(world, e);
    if (e.def.dmg > 0 && (e.id + world.tick) % 10 === 0) { // defensive animals (boar, elephant)
      const foe = world.nearest(e.x, e.y, 1.5, (o) => o.kind === 'monster' && !o.dead);
      if (foe) attack(world, e, foe);
    }
  };
  function breed(world, e) {
    if (!e.def.breed || e.age < 700 || e.hp < e.maxHp * 0.5) return;
    if (Math.random() > e.def.breed * (world.globalMods.growth || 1)) return;
    if (world.flags.sterile) return;
    let same = 0;
    world.near(e.x, e.y, 4, (o) => { if (o.type === e.type) same++; return same > 9; });
    if (same < 2 || same > 8) return;
    const b = E.spawn(world, e.type, e.x + U.rfloat(-0.5, 0.5), e.y + U.rfloat(-0.5, 0.5));
    if (b) { b.age = 0; b.hp = b.maxHp * 0.6; b.civ = e.civ; MB.fx.sparkle(e.x, e.y, '#ff9ecf', 3); }
  }
  AI.pred = (world, e) => {
    if (e.full > 0) e.full--;
    if ((e.id + world.tick) % 8 === 0) {
      const prey = e.def.prey;
      if (prey && e.full <= 0 && !e.calmed) {
        const p = world.nearest(e.x, e.y, e.def.aggroR || 8, (o) => !o.dead && prey.includes(o.type) && !(o.type === 'human' && (Math.random() < 0.6 || o.civ >= 0 && world.civs[o.civ] && world.civs[o.civ].era >= 3)));
        if (p) { e.target = p.id; e.hunting = true; }
      }
      const th = threatNear(world, e, 4);
      if (th && th.def.dmg > e.dmg * 1.5) { e.fleeing = th.id; e.fleeT = 30; }
    }
    if (e.fleeT > 0) { e.fleeT--; const th = findById(world, e.fleeing); if (th) { fleeFrom(world, e, th); return; } }
    if (e.calmed) e.calmed--;
    if (e.hunting) {
      const p = findById(world, e.target);
      if (!p || U.dist(e.x, e.y, p.x, p.y) > (e.def.aggroR || 8) * 1.5) { e.hunting = false; e.target = 0; }
      else {
        moveToward(world, e, p.x, p.y, e.speed * 1.2);
        if (attack(world, e, p) && p.dead) { e.full = 500; e.hunting = false; e.hp = Math.min(e.maxHp, e.hp + 10); }
        return;
      }
    }
    wander(world, e, e.def.wanderR || 6, e.home);
    breed(world, e);
  };
  AI.swim = (world, e) => {
    if (e.def.prey) return AI.pred(world, e);
    AI.herb(world, e);
  };
  AI.fly = (world, e) => {
    if (e.def.prey) return AI.pred(world, e);
    wander(world, e, 10, e.home);
    breed(world, e);
  };
  AI.bee = (world, e) => {
    wander(world, e, 4, e.home);
    if ((e.id + world.tick) % 30 === 0) {
      const i = world.idx(e.x | 0, e.y | 0);
      if (world.tiles[i] === T.GRASS && Math.random() < 0.3) world.setIdx(i, T.FLOWERS);
      const h = world.nearest(e.x, e.y, 1, (o) => o.kind === 'human');
      if (h && Math.random() < 0.3) E.damage(world, h, 1, 'bee', e);
    }
    breed(world, e);
  };

  // ---------- humans ----------
  AI.civilian = (world, e) => {
    const civ = e.civ >= 0 ? world.civs[e.civ] : null;
    if (civ && !civ.alive) { e.civ = -1; e.role = 'wild'; }
    if ((e.id + world.tick) % 8 === 0) {
      const th = threatNear(world, e, 6);
      if (th) { e.fleeing = th.id; e.fleeT = 50; }
    }
    if (e.fleeT > 0) { e.fleeT--; const th = findById(world, e.fleeing); if (th) { fleeFrom(world, e, th, 1.3); return; } }
    if (e.civ < 0) {
      // wild humans: wander, and gather to found a tribe
      wander(world, e, 7, e.home);
      if ((e.id + world.tick) % 60 === 0 && !world.flags.noNewCivs) {
        let cnt = 0;
        world.near(e.x, e.y, 4, (o) => { if (o.type === 'human' && o.civ < 0) cnt++; });
        const i = world.idx(e.x | 0, e.y | 0);
        if (cnt >= 4 && world.owner[i] < 0 && TILES[world.tiles[i]].build && Math.random() < 0.3) {
          let nearCiv = false;
          world.forRadius(e.x, e.y, 6, (x, y, j) => { if (world.owner[j] >= 0) nearCiv = true; });
          if (!nearCiv) {
            const c = MB.Civs.found(world, e.x | 0, e.y | 0, { era: 0, pop: cnt * 3 });
            if (c) {
              world.near(e.x, e.y, 5, (o) => { if (o.type === 'human' && o.civ < 0) { o.civ = c.id; o.role = 'civilian'; o.home = { x: c.cx, y: c.cy }; } });
              world.addLog(`Wanderers founded ${c.name}!`, 'civ', e.x, e.y);
            }
          }
        }
      }
      return;
    }
    // civilian: wander near home, sometimes travel to another owned tile
    if (!e.home) e.home = { x: civ.cx, y: civ.cy };
    if (!e.hasTarget && Math.random() < 0.01 && civ.tileArr && civ.tileArr.length) {
      const i = civ.tileArr[(Math.random() * civ.tileArr.length) | 0];
      const tx = (i % world.w) + 0.5, ty = ((i / world.w) | 0) + 0.5;
      if (U.dist(e.x, e.y, tx, ty) < 14) { e.tx = tx; e.ty = ty; e.hasTarget = true; e.timer = 200; }
    }
    wander(world, e, 5, e.home);
  };

  AI.soldier = (world, e) => {
    const civ = e.civ >= 0 ? world.civs[e.civ] : null;
    if (!civ || !civ.alive) { e.civ = -1; e.type = 'bandit'; e.def = E.DEFS.bandit; e.kind = 'monster'; return; }
    if (e.cd > 0) e.cd--;
    if ((e.id + world.tick) % 10 === 0) {
      const foe = nearestEnemy(world, e, civ.era >= 3 ? 10 : 8);
      e.target = foe ? foe.id : 0;
      if (!foe && (e.id + world.tick) % 60 === 0) {
        const atWar = Object.keys(civ.wars);
        if (atWar.length && !civ.defensive) {
          const enemy = world.civs[+U.pick(atWar)];
          if (enemy && enemy.alive && enemy.tileArr && enemy.tileArr.length) {
            // pick nearest sampled enemy tile
            let best = -1, bd = Infinity;
            for (let k = 0; k < 30; k++) {
              const i = enemy.tileArr[(Math.random() * enemy.tileArr.length) | 0];
              const d = U.dist2(e.x, e.y, (i % world.w) + 0.5, ((i / world.w) | 0) + 0.5);
              if (d < bd) { bd = d; best = i; }
            }
            if (best >= 0) {
              const tx = (best % world.w) + 0.5, ty = ((best / world.w) | 0) + 0.5;
              // only march if reachable-ish (same landmass heuristic: both land, distance moderate)
              if (bd < 60 * 60) { e.tx = tx; e.ty = ty; e.hasTarget = true; e.timer = 600; e.marching = true; }
            }
          }
        } else e.marching = false;
      }
    }
    const foe = findById(world, e.target);
    if (foe) {
      // ranged eras
      const ranged = civ.era >= 2;
      if (ranged && e.def.range < 2) { /* use projectile at range 4 */ }
      const d = U.dist(e.x, e.y, foe.x, foe.y);
      if (ranged && d > 1.3 && d < 4.5 && e.cd <= 0) {
        e.cd = e.def.atkCd + 6;
        MB.lib.fireProjectile(world, e, foe.x, foe.y, civ.era >= 5 ? 'bullet' : civ.era >= 4 ? 'cannon' : 'arrow', e.dmg * (civ.era >= 5 ? 1.5 : 1));
      } else {
        moveToward(world, e, foe.x, foe.y, e.speed * 1.1);
        attack(world, e, foe, 1 + civ.era * 0.25);
      }
      return;
    }
    // capture enemy tiles
    const xi = e.x | 0, yi = e.y | 0, i = yi * world.w + xi;
    const o = world.owner[i];
    if (o >= 0 && o !== e.civ && civ.wars[o] && (e.id + world.tick) % 20 === 0) {
      const defenders = world.nearest(e.x, e.y, 3, (q) => q.civ === o && q.type === 'soldier');
      if (!defenders) MB.Civs.captureTile(world, i, civ, world.civs[o]);
    }
    if (e.marching && e.hasTarget) {
      if (moveToward(world, e, e.tx, e.ty, e.speed)) { e.hasTarget = false; e.marching = false; }
      e.timer--; if (e.timer <= 0) { e.hasTarget = false; e.marching = false; }
      if (e.blocked > 30) { e.hasTarget = false; e.marching = false; e.blocked = 0; }
      return;
    }
    wander(world, e, 4, e.home || { x: civ.cx, y: civ.cy });
  };

  AI.hero = (world, e) => {
    if (e.cd > 0) e.cd--;
    if ((e.id + world.tick) % 8 === 0) {
      const m = nearestMonster(world, e, e.def.aggroR);
      e.target = m ? m.id : 0;
      if (!m && e.hp < e.maxHp) e.hp += 1;
    }
    const m = findById(world, e.target);
    if (m) { moveToward(world, e, m.x, m.y, e.speed * 1.2); attack(world, e, m); return; }
    wander(world, e, 10, e.home);
  };

  AI.settler = (world, e) => {
    const civ = e.civ >= 0 ? world.civs[e.civ] : null;
    if (e.ttx === undefined) { e.ttx = e.x; e.tty = e.y; }
    const arrived = moveToward(world, e, e.ttx, e.tty, e.speed);
    e.timer++;
    if (arrived || e.blocked > 40 || e.timer > 1500) {
      const xi = e.x | 0, yi = e.y | 0, i = yi * world.w + xi;
      if (TILES[world.tiles[i]].build && world.owner[i] < 0) {
        if (civ && civ.alive) MB.Civs.foundColony(world, civ, xi, yi, e.data.pop || 6);
        else { const c = MB.Civs.found(world, xi, yi, { era: 0, pop: e.data.pop || 8 }); if (c) world.addLog(`Settlers founded ${c.name}.`, 'civ', xi, yi); }
        E.kill(world, e, 'settled');
        e.dead = true; e.noFx = true;
      } else if (!pickWander(world, e, 4)) { E.kill(world, e, 'lost'); }
      else { e.ttx = e.tx; e.tty = e.ty; e.timer = 1300; e.blocked = 0; }
    }
  };
  AI.nomad = (world, e) => {
    wander(world, e, 12, null);
    if (world.tick % 100 === (e.id % 100) && Math.random() < 0.08 && !world.flags.noNewCivs) {
      const i = world.idx(e.x | 0, e.y | 0);
      if (world.owner[i] < 0 && TILES[world.tiles[i]].build) {
        let near = 0; world.forRadius(e.x, e.y, 8, (x, y, j) => { if (world.owner[j] >= 0) near++; });
        if (!near) { const c = MB.Civs.found(world, e.x | 0, e.y | 0, { era: 0, pop: 8 }); if (c) { world.addLog(`Nomads settled and founded ${c.name}.`, 'civ', e.x, e.y); E.kill(world, e, 'settled'); } }
      }
    }
  };
  AI.leader = (world, e) => {
    const civ = e.civ >= 0 ? world.civs[e.civ] : null;
    if (!civ || !civ.alive) { E.kill(world, e, 'exile'); return; }
    if ((e.id + world.tick) % 8 === 0) { const th = threatNear(world, e, 6); if (th) { e.fleeing = th.id; e.fleeT = 40; } }
    if (e.fleeT > 0) { e.fleeT--; const th = findById(world, e.fleeing); if (th) { fleeFrom(world, e, th); return; } }
    wander(world, e, 2.5, { x: civ.cx + 0.5, y: civ.cy + 0.5 });
  };
  AI.wizard = (world, e) => {
    if (e.cd > 0) e.cd--;
    if ((e.id + world.tick) % 10 === 0) {
      const m = nearestMonster(world, e, e.def.aggroR) || (e.civ >= 0 ? nearestEnemy(world, e, 8) : null);
      e.target = m ? m.id : 0;
      if (!m && e.cd <= 0) {
        const hurt = world.nearest(e.x, e.y, 5, (o) => (o.kind === 'human' || o.kind === 'animal') && o.hp < o.maxHp * 0.7 && (e.civ < 0 || o.civ === e.civ));
        if (hurt) { E.heal(hurt, 15); MB.fx.sparkle(hurt.x, hurt.y, '#7fffd4', 5); e.cd = 40; }
      }
    }
    const m = findById(world, e.target);
    if (m) {
      const d = U.dist(e.x, e.y, m.x, m.y);
      if (d > 7) moveToward(world, e, m.x, m.y, e.speed);
      else if (d < 3) fleeFrom(world, e, m, 1);
      if (e.cd <= 0 && d < 8) { e.cd = 35; MB.lib.fireProjectile(world, e, m.x, m.y, 'fireball', e.dmg); }
      return;
    }
    wander(world, e, 5, e.home);
  };
  AI.trader = (world, e) => {
    if (!e.data.dest || (e.id + world.tick) % 200 === 0) {
      const alive = world.civs.filter((c) => c.alive && c.id !== e.data.dest);
      if (!alive.length) { wander(world, e, 6, null); return; }
      const c = U.pick(alive);
      e.data.dest = c.id; e.ttx = c.cx + 0.5; e.tty = c.cy + 0.5;
    }
    const arrived = moveToward(world, e, e.ttx, e.tty, e.speed);
    if (arrived || e.blocked > 50) {
      const c = world.civs[e.data.dest];
      if (c && c.alive && arrived) {
        c.gold += 25; c.happiness = Math.min(100, c.happiness + 2);
        if (e.data.from != null && world.civs[e.data.from] && world.civs[e.data.from].alive) { MB.Civs.changeRelation(world, world.civs[e.data.from], c, 4); world.civs[e.data.from].gold += 15; }
        e.data.from = c.id;
        MB.fx.sparkle(e.x, e.y, '#ffd700', 6);
      }
      e.data.dest = null; e.blocked = 0;
    }
  };
  AI.prophet = (world, e) => {
    wander(world, e, 8, e.home);
    if ((e.id + world.tick) % 15 === 0) {
      const i = world.idx(e.x | 0, e.y | 0);
      const t = world.tiles[i];
      if ((t === T.GRASS || t === T.CORRUPT || t === T.ASH || t === T.WASTE) && Math.random() < 0.4) world.setIdx(i, T.HOLY);
      const c = world.civAt(e.x | 0, e.y | 0);
      if (c && c.alive) { c.happiness = Math.min(100, c.happiness + 0.3); c.faith = (c.faith || 0) + 0.5; }
      world.near(e.x, e.y, 3, (o) => { if (o.kind === 'monster' && !o.dead) E.damage(world, o, 6, 'holy', e); });
    }
  };
  AI.druid = (world, e) => {
    wander(world, e, 9, e.home);
    if ((e.id + world.tick) % 10 === 0) {
      const i = world.idx(e.x | 0, e.y | 0);
      const t = world.tiles[i];
      if (MB.tiles.GROWABLE.has(t) && Math.random() < 0.5) world.setIdx(i, T.GRASS);
      else if (t === T.GRASS && Math.random() < 0.08) world.setIdx(i, Math.random() < 0.3 ? T.FLOWERS : T.FOREST);
      if (world.rad[i] > 0) world.rad[i] = Math.max(0, world.rad[i] - 20);
      if (world.poll[i] > 0) world.poll[i] = Math.max(0, world.poll[i] - 20);
      world.moist[i] = Math.min(255, world.moist[i] + 40);
      if (world.fire[i]) world.extinguish(i);
    }
  };

  // ---------- boats ----------
  AI.boat = (world, e) => {
    const civ = e.civ >= 0 ? world.civs[e.civ] : null;
    if (e.ttx === undefined) { E.kill(world, e, 'lost'); return; }
    e.timer++;
    const d = U.dist(e.x, e.y, e.ttx, e.tty);
    // when adjacent to target land, unload
    if (d < 1.6 || (e.blocked > 20 && d < 4) || e.timer > 2500) {
      const xi = Math.round(e.ttx - 0.5), yi = Math.round(e.tty - 0.5);
      // find land tile near
      let lx = -1, ly = -1;
      world.forRadius(e.x, e.y, 2.5, (x, y, i) => { if (lx < 0 && TILES[world.tiles[i]].build && world.owner[i] < 0) { lx = x; ly = y; } });
      if (lx < 0) { lx = xi; ly = yi; }
      if (world.inb(lx, ly) && TILES[world.tiles[world.idx(lx, ly)]].build) {
        if (civ && civ.alive) {
          if (e.data.passengers && e.data.mission === 'colonize') MB.Civs.foundColony(world, civ, lx, ly, e.data.passengers);
          else if (e.data.mission === 'invade' && e.data.passengers) {
            for (let k = 0; k < e.data.passengers; k++) E.spawn(world, 'soldier', lx + 0.5 + U.rfloat(-0.5, 0.5), ly + 0.5 + U.rfloat(-0.5, 0.5), { civ: civ.id, home: { x: lx, y: ly } });
          }
        }
        if (civ) civ.boatsOut = Math.max(0, (civ.boatsOut || 0) - 1);
        e.dead = true;
        return;
      }
      if (e.timer > 2500 || e.blocked > 60) { E.kill(world, e, 'lost'); return; }
      e.blocked = 0;
    }
    moveToward(world, e, e.ttx, e.tty, e.speed);
  };
  AI.fishing = (world, e) => {
    wander(world, e, 5, e.home);
    const civ = e.civ >= 0 ? world.civs[e.civ] : null;
    if (civ && civ.alive && (e.id + world.tick) % 40 === 0) {
      let fish = 0; world.near(e.x, e.y, 3, (o) => { if (o.type === 'fish' || o.type === 'salmon') fish++; });
      civ.food += 3 + fish;
      if (fish && Math.random() < 0.3) { const f = world.nearest(e.x, e.y, 3, (o) => o.type === 'fish' || o.type === 'salmon'); if (f) E.kill(world, f, 'fished'); }
    } else if (!civ || !civ.alive) E.kill(world, e, 'lost');
  };
  AI.warship = (world, e) => {
    const civ = e.civ >= 0 ? world.civs[e.civ] : null;
    if (!civ || !civ.alive) { E.kill(world, e, 'lost'); return; }
    if (e.cd > 0) e.cd--;
    if ((e.id + world.tick) % 10 === 0) {
      const foe = world.nearest(e.x, e.y, 9, (o) => isEnemyOf(world, e, o) && !o.def.ethereal);
      e.target = foe ? foe.id : 0;
    }
    const foe = findById(world, e.target);
    if (foe) {
      const d = U.dist(e.x, e.y, foe.x, foe.y);
      if (d > 3) moveToward(world, e, foe.x, foe.y, e.speed);
      if (d < 5 && e.cd <= 0) { e.cd = 40; MB.lib.fireProjectile(world, e, foe.x, foe.y, 'cannon', e.dmg); }
      return;
    }
    wander(world, e, 8, e.home);
  };

  MB.AIcore = { moveToward, pickWander, wander, fleeFrom, findById, attack, isEnemyOf, nearestEnemy, nearestMonster, threatNear, hazards, breed, mutate };
  MB.AI = AI;
})();
