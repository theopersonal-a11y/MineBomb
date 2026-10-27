'use strict';
// MineBomb - civilization simulation loop (growth, building, military, diplomacy, events)
(function () {
  const U = MB.util, T = MB.T, TILES = MB.TILES;
  const E = MB.Entities, C = MB.Civs, B = C.BUILDINGS;
  const CIV_INTERVAL = 10; // ticks between civ updates
  const FOOD_PER_POP = 0.06;

  function fullName(c) { return C.fullName(c); }

  function computeYields(world, c) {
    const y = { food: 0, wood: 0, stone: 0, iron: 0, gold: 0, science: 0, culture: 0, faith: 0, happy: 0, housing: 8 + c.era * 4, defense: 0, military: 0, pollution: 0 };
    // buildings
    for (const j of c.buildings) {
      const b = world.buildings.get(j);
      if (!b || b.prog < 1) continue;
      const bd = B[b.t];
      const eff = b.hp / b.maxHp < 0.5 ? 0.5 : 1;
      y.food += bd.food * eff; y.wood += bd.wood * eff; y.stone += bd.stone * eff; y.iron += bd.iron * eff; y.gold += bd.gold * eff;
      y.science += bd.science * eff; y.culture += bd.culture; y.faith += bd.faith; y.happy += bd.happy; y.housing += bd.housing;
      y.defense += bd.defense; y.military += bd.military; y.pollution += bd.pollution;
      if (bd.site === 'hills') { const t = world.tiles[j]; const td = TILES[t]; y.gold += (td.gold || 0) * 1.5; y.iron += (td.iron || 0) * 2; y.stone += (td.stone || 0) * 0.5; if (td.coal) y.gold += 1; }
      if (b.t === 'ranch' && c.livestockNear && world.tick - c.livestockNear < 200) y.food += 2;
    }
    // territory (sampled)
    const arr = c.tileArr;
    if (arr && arr.length) {
      const n = Math.min(arr.length, 120);
      const step = Math.max(1, Math.floor(arr.length / n));
      let f = 0, w = 0, s = 0, hp = 0, sci = 0, pol = 0, rad = 0;
      for (let k = 0; k < arr.length; k += step) {
        const i = arr[k];
        const td = TILES[world.tiles[i]];
        f += (td.food || 0) * 0.15 + td.fert * 0.08;
        w += (td.wood || 0) * 0.1;
        s += (td.stone || 0) * 0.05;
        hp += (td.happy || 0) * 0.05;
        sci += (td.science || 0) * 0.1;
        pol += world.poll[i]; rad += world.rad[i];
      }
      const scale = arr.length / Math.ceil(arr.length / step);
      y.food += f * scale; y.wood += w * scale; y.stone += s * scale; y.happy += hp * scale * 0.3; y.science += sci * scale;
      c.avgPoll = pol / Math.ceil(arr.length / step); c.avgRad = rad / Math.ceil(arr.length / step);
    }
    // base
    y.wood += 0.5 + c.era * 0.3; y.stone += c.era >= 1 ? 0.3 : 0; y.gold += c.pop * 0.004 * (1 + c.era * 0.3) * (c.personality.trade + 0.5);
    y.science += c.pop * 0.02 * (1 + c.era * 0.15) * (0.6 + c.personality.science) * (world.globalMods.science || 1) * c.mods.science;
    y.culture += c.pop * 0.005 + (c.traits.includes('artistic') ? 1 : 0);
    y.faith += c.personality.piety * 0.5;
    const mult = c.mods.yields * (c.goldenAge > 0 ? 1.5 : 1) * (c.darkAge > 0 ? 0.6 : 1) * (c.traits.includes('industrious') ? 1.15 : 1) * (c.avgRad > 40 ? 0.6 : 1);
    const season = world.seasonIndex();
    y.food *= mult * (season === 3 ? 0.65 : season === 1 ? 1.1 : 1) * (c.traits.includes('agrarian') ? 1.2 : 1) * (world.globalMods.fertility || 1) * (c.plague ? 0.75 : 1);
    y.wood *= mult; y.stone *= mult; y.iron *= mult; y.gold *= mult; y.science *= mult;
    return y;
  }

  function updateCiv(world, c, game) {
    if (!c.alive) return;
    c.ticks++;
    if (c.ticks % 10 === 0 || !c.tileArr.length) C.refreshTileArr(c);
    if (c.ticks % 4 === 0 || !c.yields) c.yields = computeYields(world, c);
    const y = c.yields;
    // ---- resources ----
    const consumption = c.pop * FOOD_PER_POP * (c.era >= 5 ? 0.9 : 1);
    c.food += y.food - consumption;
    c.wood += y.wood; c.stone += y.stone; c.iron += y.iron; c.gold += y.gold; c.science += y.science; c.culture += y.culture; c.faith += y.faith;
    const cap = 600 + c.era * 600 + c.pop * 3;
    for (const k of ['wood', 'stone', 'iron']) if (c[k] > cap) c[k] = cap;
    if (c.gold > cap * 4) c.gold = cap * 4;
    if (c.food > 300 + c.pop * 3) c.food = 300 + c.pop * 3;
    // ---- population ----
    const housing = y.housing;
    c.housing = housing;
    if (c.food > 0) {
      const room = c.pop < housing ? 1 : c.pop < housing * 1.3 ? 0.15 : 0;
      let g = c.pop * 0.0045 * (0.4 + c.happiness / 100) * room * (world.globalMods.growth || 1) * c.mods.growth * (c.plague ? 0.2 : 1) * (c.goldenAge ? 1.4 : 1);
      if (c.flags.babyBoom > 0) g *= 3;
      if (c.pop < 6) g += 0.02;
      if (world.flags.sterile) g = 0;
      c.pop += g;
      c.famine = 0;
    } else {
      c.food = 0;
      c.pop -= c.pop * 0.012 + 0.3;
      c.happiness -= 0.8;
      c.famine = (c.famine || 0) + 1;
      if (c.famine === 20) world.addLog(`Famine grips ${fullName(c)}.`, 'bad', c.cx, c.cy);
    }
    if (c.pop > c.maxPop) c.maxPop = c.pop;
    // ---- happiness ----
    const wars = Object.keys(c.wars).length;
    let base = 45 + y.happy * 2 + (c.food > 30 ? 8 : -12) - wars * 8 - (c.plague ? 20 : 0) + c.era * 1.5 - (c.avgPoll || 0) / 6 - (c.avgRad || 0) / 4 + c.culture * 0.002 - (c.pop > housing * 1.2 ? 12 : 0) - c.fear * 0.3 + (c.goldenAge > 0 ? 15 : 0) - (c.darkAge > 0 ? 15 : 0) + (c.flags.blessed > 0 ? 25 : 0) - (c.flags.cursed > 0 ? 30 : 0) + (c.traits.includes('resilient') ? 5 : 0);
    if (world.flags.eternalNight) base -= 10;
    c.happiness += (U.clamp(base, 0, 100) - c.happiness) * 0.04;
    c.happiness = U.clamp(c.happiness, 0, 100);
    if (c.fear > 0) c.fear -= 0.1;
    for (const k in c.flags) { if (typeof c.flags[k] === 'number' && c.flags[k] > 0) { c.flags[k]--; if (c.flags[k] <= 0) delete c.flags[k]; } }
    if (c.goldenAge > 0) { c.goldenAge--; if (c.goldenAge === 0) world.addLog(`The golden age of ${fullName(c)} has ended.`, 'civ', c.cx, c.cy); }
    if (c.darkAge > 0) c.darkAge--;
    if (c.immune > 0) c.immune--;
    // ---- plague ----
    if (c.plague) {
      c.plague.timer--;
      c.pop -= c.pop * 0.0035 * c.plague.severity;
      if (c.plague.timer <= 0 || c.pop < 3) { c.plague = null; c.immune = 2500; world.addLog(`The plague in ${fullName(c)} has ended.`, 'civ', c.cx, c.cy); }
      else if (c.ticks % 40 === 0 && Math.random() < 0.15) { // spread to neighbors with contact
        for (const o of world.civs) if (o.alive && o !== c && !o.plague && !o.immune && Math.random() < 0.25 && U.dist(o.cx, o.cy, c.cx, c.cy) < 40) C.plague(world, o, c.plague.severity * 0.8);
      }
    }
    // ---- era ----
    if (c.era < C.ERAS.length - 1 && c.science >= C.ERA_COST[c.era] && c.pop >= C.ERA_POP[c.era] * 0.8 && !world.flags.techFreeze) {
      c.science -= C.ERA_COST[c.era] * 0.7;
      C.setEra(world, c, c.era + 1);
    }
    // ---- building ----
    progressConstruction(world, c);
    if (c.ticks % 2 === 0) decideBuild(world, c);
    if (c.upgradeHousing > 0 && c.ticks % 3 === 0) upgradeHousing(world, c);
    // ---- expansion ----
    if (c.ticks % 3 === 0) expand(world, c);
    // ---- military ----
    if (c.ticks % 5 === 0) military(world, c);
    if (c.ticks % 2 === 0) towers(world, c);
    // ---- visible humans ----
    if (c.ticks % 4 === 0) syncHumans(world, c);
    // ---- diplomacy ----
    if (c.ticks % 10 === (c.id % 10)) diplomacy(world, c);
    // ---- colonization ----
    if (c.ticks % 24 === 0) colonize(world, c);
    // ---- unrest ----
    unrest(world, c);
    // ---- events ----
    if (Math.random() < 0.0025 * (world.params.disasters || 1) + 0.001) randomEvent(world, c);
    // ---- pollution output ----
    if (y.pollution > 0 && c.ticks % 2 === 0) {
      for (const j of c.buildings) { const b = world.buildings.get(j); if (b && b.prog >= 1 && B[b.t].pollution) world.poll[j] = Math.min(255, world.poll[j] + B[b.t].pollution * (world.flags.cleanTech ? 0 : 1)); }
    }
    // repair
    if (c.ticks % 6 === 0 && c.wood > 5) { let n = 0; for (const j of c.buildings) { const b = world.buildings.get(j); if (b && b.hp < b.maxHp && b.prog >= 1) { b.hp = Math.min(b.maxHp, b.hp + 4); if (++n > 6) break; } } }
    // ---- death ----
    if (c.pop < 1 || c.tiles.size === 0) {
      if (world.flags.immortalCivs || c.immortal) {
        c.pop = Math.max(c.pop, 10); c.food = Math.max(c.food, 50);
        if (c.tiles.size === 0) { const i = world.idx(c.cx, c.cy); if (TILES[world.tiles[i]].land) { world.setOwner(i, c.id); C.refreshTileArr(c); } }
        return;
      }
      C.killCiv(world, c, c.pop < 1 ? (c.famine > 10 ? 'famine' : c.plague ? 'plague' : 'extinction') : 'lost all land'); return;
    }
  }

  function progressConstruction(world, c) {
    let n = 0;
    for (const j of c.buildings) {
      const b = world.buildings.get(j);
      if (!b || b.prog >= 1) continue;
      b.prog += (0.08 + c.era * 0.02) / B[b.t].buildTime * (c.goldenAge ? 1.5 : 1) * (c.personality.industry + 0.6);
      if (b.prog >= 1) C.completeBuilding(world, c, b);
      world.markDirty(b.x, b.y);
      if (++n > 4) break;
    }
  }

  function countType(world, c, type) { let n = 0; for (const j of c.buildings) { const b = world.buildings.get(j); if (b && b.t === type) n++; } return n; }
  function countCat(world, c, cat) { let n = 0; for (const j of c.buildings) { const b = world.buildings.get(j); if (b && B[b.t].cat === cat) n++; } return n; }
  function underConstruction(world, c) { let n = 0; for (const j of c.buildings) { const b = world.buildings.get(j); if (b && b.prog < 1) n++; } return n; }

  function bestOf(c, keys) {
    let best = null;
    for (const k of keys) { const bd = B[k]; if (bd.era <= c.era && (!best || bd.era > B[best].era)) best = k; }
    return best;
  }
  function decideBuild(world, c) {
    if (underConstruction(world, c) >= 3 + c.era) return;
    const y = c.yields;
    const housesNeeded = c.pop > y.housing * 0.8;
    const options = [];
    const hType = C.HOUSING[c.era];
    if (housesNeeded) options.push({ t: hType, s: 10 + (c.pop - y.housing * 0.8) * 0.3 });
    const consumption = c.pop * FOOD_PER_POP;
    if (y.food < consumption * 1.35 || c.food < c.pop) {
      options.push({ t: 'farm', s: 9 });
      if (c.era >= 1) options.push({ t: 'ranch', s: 5 });
      const fish = bestOf(c, ['fishing_hut', 'dock']); if (fish) options.push({ t: fish, s: 7 });
      const gh = bestOf(c, ['greenhouse', 'hydroponics']); if (gh) options.push({ t: gh, s: 8 });
    }
    if (c.wood < 40 + c.era * 20) { options.push({ t: 'lumber_camp', s: 6 }); if (c.era >= 3) options.push({ t: 'sawmill', s: 5 }); }
    if (c.era >= 1 && c.stone < 30 + c.era * 15) { options.push({ t: 'quarry', s: 6 }); if (c.era >= 2) options.push({ t: 'mine', s: 5 }); }
    if (c.era >= 2 && c.iron < 20 + c.era * 15) { options.push({ t: 'mine', s: 6 }); if (c.era >= 5) options.push({ t: 'deep_mine', s: 6 }); }
    if (c.era >= 2) options.push({ t: 'workshop', s: 2 });
    if (c.era >= 5) options.push({ t: 'factory', s: 3 + c.personality.industry * 3 });
    if (c.era >= 6) options.push({ t: 'power_plant', s: 3 }); if (c.era >= 6) options.push({ t: 'oil_rig', s: 3 });
    if (c.era >= 7) options.push({ t: 'solar_farm', s: 3 + (c.avgPoll > 30 ? 3 : 0) }); if (c.era >= 7) options.push({ t: 'nuclear_plant', s: 2 });
    if (c.era >= 8) { options.push({ t: 'fusion_reactor', s: 4 }); options.push({ t: 'robot_factory', s: 3 }); options.push({ t: 'rocket_pad', s: 5 }); options.push({ t: 'shield_generator', s: 3 }); }
    if (c.happiness < 55) { for (const k of ['shrine', 'temple', 'tavern', 'well', 'plaza', 'statue', 'theater', 'park', 'hospital', 'stadium', 'cathedral']) if (B[k].era <= c.era) options.push({ t: k, s: 4 + (55 - c.happiness) * 0.1 + (B[k].faith ? c.personality.piety * 3 : 0) }); }
    if (c.era >= 2) for (const k of ['library', 'school', 'university', 'laboratory', 'internet_hub']) if (B[k].era <= c.era) options.push({ t: k, s: 2 + c.personality.science * 4 });
    if (c.era >= 2) options.push({ t: 'market', s: 2 + c.personality.trade * 3 });
    const wars = Object.keys(c.wars).length;
    const threat = wars > 0 || c.fear > 10 || c.personality.aggression > 0.6;
    if (c.era >= 1) options.push({ t: 'barracks', s: (threat ? 7 : 1.5) + c.personality.aggression * 3 });
    if (c.era >= 2 && threat) { options.push({ t: 'wall', s: 5 }); options.push({ t: 'tower', s: 5 }); }
    if (c.era >= 3) options.push({ t: 'castle', s: threat ? 5 : 2 });
    if (c.era >= 5 && threat) options.push({ t: 'fort', s: 4 });
    if (c.era >= 7 && threat) { options.push({ t: 'bunker', s: 4 }); options.push({ t: 'missile_silo', s: 2 + c.personality.aggression * 4 }); }
    if (c.era >= 2 && c.personality.sea > 0.3) { const p = bestOf(c, ['port', 'harbor']); if (p) options.push({ t: p, s: 4 + c.personality.sea * 4 }); }
    if (c.era >= 6) options.push({ t: 'airport', s: 2 });
    if (c.gold > 100 || c.stone > 150) for (const k of C.WONDERS) if (B[k].era <= c.era && k !== 'world_tree') options.push({ t: k, s: 2 + Math.random() * 3 });
    if (!options.length) return;
    // filter by caps/uniques/affordability
    const viable = [];
    for (const o of options) {
      const bd = B[o.t];
      if (bd.unique && C.hasBuilding(world, c, o.t)) continue;
      if (bd.max && countType(world, c, o.t) >= bd.max) continue;
      if (!C.canAfford(c, bd)) { if (o.s > 8) c.saving = o.t; continue; }
      viable.push(o);
    }
    if (!viable.length) return;
    viable.sort((a, b) => b.s - a.s);
    // weighted pick among top 3
    const pickFrom = viable.slice(0, 3);
    const o = Math.random() < 0.6 ? pickFrom[0] : U.pick(pickFrom);
    const bd = B[o.t];
    const site = C.findSite(world, c, bd);
    if (!site) { if (o.t === 'farm' || bd.cat === 'house') c.cramped = (c.cramped || 0) + 1; return; }
    C.build(world, c, o.t, site.x, site.y, false);
    if (o.t === 'wall') { // build a few walls at once
      for (let k = 0; k < 3; k++) { const s2 = C.findSite(world, c, bd); if (s2 && C.canAfford(c, bd)) C.build(world, c, 'wall', s2.x, s2.y, false); }
    }
  }
  function upgradeHousing(world, c) {
    c.upgradeHousing--;
    const target = C.HOUSING[c.era];
    const tb = B[target];
    if (!C.canAfford(c, tb, 0.6)) return;
    for (const j of c.buildings) {
      const b = world.buildings.get(j);
      if (!b || b.prog < 1 || B[b.t].cat !== 'house') continue;
      if (C.HOUSING.indexOf(b.t) < c.era - 1 && b.t !== 'arcology') {
        C.pay(c, tb, 0.6);
        b.t = target; b.maxHp = tb.hp; b.hp = tb.hp; b.prog = 0.5;
        world.markDirty(b.x, b.y);
        return;
      }
    }
    c.upgradeHousing = 0;
  }

  function expand(world, c) {
    const desired = 14 + c.pop * (0.9 + c.personality.expansion * 0.8) + c.era * 6 + c.culture * 0.01;
    if (c.tiles.size >= desired || !c.tileArr.length) return;
    const n = c.tiles.size < desired * 0.5 ? 4 : 2;
    let claimed = 0;
    for (let k = 0; k < n * 4 && claimed < n; k++) {
      const i = c.tileArr[(Math.random() * c.tileArr.length) | 0];
      const x = i % world.w, y = (i / world.w) | 0;
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const [dx, dy] = dirs[(Math.random() * 4) | 0];
      const nx = x + dx, ny = y + dy;
      if (!world.inb(nx, ny)) continue;
      const j = ny * world.w + nx;
      const td = TILES[world.tiles[j]];
      if (!td.land) continue;
      if (world.tiles[j] === T.VOID || world.tiles[j] === T.CORRUPT) continue;
      const o = world.owner[j];
      if (o === c.id) continue;
      if (o >= 0) { // friction
        const other = world.civs[o];
        if (other && other.alive) { C.changeRelation(world, c, other, -0.15 * (c.personality.aggression + 0.3)); if (c.wars[o] && Math.random() < 0.02) C.captureTile(world, j, c, other); }
        continue;
      }
      if (U.dist(nx, ny, c.cx, c.cy) > 10 + c.pop * 0.3 + c.era * 4 && c.colonies === 0 && Math.random() < 0.7) continue;
      world.setOwner(j, c.id);
      c.tileArr.push(j);
      claimed++;
    }
  }

  function military(world, c) {
    // recount soldiers
    let soldiers = 0, hasLeader = false;
    for (const e of world.entities) { if (e.dead || e.civ !== c.id) continue; if (e.type === 'soldier') soldiers++; else if (e.type === 'leader') hasLeader = true; }
    c.soldiers = soldiers;
    const barracks = (c.yields && c.yields.military) || 0;
    const wars = Object.keys(c.wars).length;
    const desired = Math.min(Math.floor(c.pop / 3), Math.floor(c.pop * (0.04 + c.personality.aggression * 0.08) * (wars ? 2.2 : 1) * (c.fear > 20 ? 1.4 : 1)) + barracks * 2, 2 + barracks * 6 + (c.era >= 6 ? 10 : 0));
    if (soldiers < desired && c.pop > 8 && c.gold >= 2) {
      c.gold -= 2;
      let sx = c.cx, sy = c.cy;
      const bars = []; for (const j of c.buildings) { const b = world.buildings.get(j); if (b && B[b.t].military) bars.push(b); }
      if (bars.length) { const b = U.pick(bars); sx = b.x; sy = b.y; }
      const s = E.spawn(world, 'soldier', sx + 0.5 + U.rfloat(-1, 1), sy + 0.5 + U.rfloat(-1, 1), { civ: c.id, home: { x: sx + 0.5, y: sy + 0.5 } });
      if (s) { s.hp = s.maxHp = 40 + c.era * 12; s.dmg = 8 + c.era * 3; if (c.era >= 6) s.armor = 0.3; c.soldiers++; }
    }
    if (!hasLeader && c.pop > 15 && (c.leaderSpawnDue || Math.random() < 0.2)) {
      c.leaderSpawnDue = false;
      E.spawn(world, 'leader', c.cx + 0.5, c.cy + 0.5, { civ: c.id, name: c.leader.name, home: { x: c.cx + 0.5, y: c.cy + 0.5 } });
    }
    // missiles
    if (wars && c.era >= 7 && !world.flags.noMissiles && Math.random() < 0.02 && C.hasBuilding(world, c, 'missile_silo')) {
      const targetId = +U.pick(Object.keys(c.wars));
      const tgt = world.civs[targetId];
      if (tgt && tgt.alive) {
        const nuke = c.era >= 8 && c.traits.includes('ruthless') && !world.flags.noNukes && Math.random() < 0.3;
        E.spawn(world, 'missile', c.cx + 0.5, c.cy + 0.5, { ttx: tgt.cx + 0.5 + U.rfloat(-2, 2), tty: tgt.cy + 0.5 + U.rfloat(-2, 2), data: { explode: nuke ? { r: 9, power: 300, fire: 0.5, rad: 120, crater: true, nuke: true, cause: 'civ-nuke' } : { r: 3.5, power: 70, fire: 0.3, cause: 'missile' } } });
        world.addLog(nuke ? `☢️ ${fullName(c)} LAUNCHED A NUCLEAR MISSILE at ${fullName(tgt)}!` : `${fullName(c)} fired a missile at ${fullName(tgt)}.`, 'war', tgt.cx, tgt.cy);
        if (nuke) { for (const o of world.civs) if (o.alive && o !== c) C.changeRelation(world, c, o, -40); }
      }
    }
    // rockets
    if (c.era >= 8 && Math.random() < 0.01 && C.hasBuilding(world, c, 'rocket_pad') && c.gold > 100) {
      c.gold -= 100;
      E.spawn(world, 'rocket', c.cx + 0.5, c.cy + 0.5, { civ: c.id });
      if (c.spaceLaunches === 2) world.addLog(`🌟 ${fullName(c)} has established a presence among the stars!`, 'good', c.cx, c.cy);
    }
    // robots
    if (c.era >= 8 && Math.random() < 0.05 && C.hasBuilding(world, c, 'robot_factory')) { let robots = 0; for (const e of world.entities) if (!e.dead && e.type === 'robot' && e.civ === c.id) robots++; if (robots < 6) E.spawn(world, 'robot', c.cx + 0.5, c.cy + 0.5, { civ: c.id, home: { x: c.cx, y: c.cy } }); }
    // shield generator
    if (c.era >= 8 && C.hasBuilding(world, c, 'shield_generator')) { for (const j of c.buildings) { const b = world.buildings.get(j); if (b && b.t === 'shield_generator') { (world.shields = world.shields || []).push({ x: b.x + 0.5, y: b.y + 0.5, r: 7 }); world.forRadius(b.x, b.y, 7, (x, y, i) => { const bb = world.buildings.get(i); if (bb) bb.shielded = world.tick + 10; }); } } }
  }

  function towers(world, c) {
    for (const j of c.buildings) {
      const b = world.buildings.get(j);
      if (!b || b.prog < 1) continue;
      const bd = B[b.t];
      if (!bd.range) continue;
      if ((b.cd || 0) > 0) { b.cd--; continue; }
      const foe = world.nearest(b.x + 0.5, b.y + 0.5, bd.range, (o) => !o.dead && ((o.kind === 'monster' && !o.def.ethereal) || (o.civ >= 0 && o.civ !== c.id && c.wars[o.civ])));
      if (foe) {
        b.cd = 3;
        const kind = c.era >= 6 ? 'laser' : c.era >= 4 ? 'cannon' : 'arrow';
        MB.lib.fireProjectile(world, { x: b.x + 0.5, y: b.y + 0.5, civ: c.id, id: -1, kind: 'human', def: { key: 'tower' } }, foe.x, foe.y, kind, 12 + c.era * 6 + bd.defense * 3);
      }
    }
  }

  function syncHumans(world, c) {
    let humans = 0;
    const list = [];
    for (const e of world.entities) { if (e.dead || e.civ !== c.id) continue; if (e.type === 'human') { humans++; list.push(e); } }
    const target = U.clamp(Math.ceil(c.pop / 4), 2, 40 + c.era * 4);
    if (humans < target && c.tileArr.length) {
      const n = Math.min(3, target - humans);
      for (let k = 0; k < n; k++) {
        // spawn near a house
        let i = c.tileArr[(Math.random() * c.tileArr.length) | 0];
        for (let t = 0; t < 4; t++) { const j = c.tileArr[(Math.random() * c.tileArr.length) | 0]; if (world.buildings.has(j)) { i = j; break; } }
        const x = (i % world.w) + 0.5, y = ((i / world.w) | 0) + 0.5;
        if (!TILES[world.tiles[i]].walk) continue;
        E.spawn(world, 'human', x, y, { civ: c.id, role: 'civilian', home: { x, y } });
      }
    } else if (humans > target + 6) {
      for (let k = 0; k < Math.min(3, humans - target); k++) { const e = list[k]; e.dead = true; e.noFx = true; }
    }
  }

  function diplomacy(world, c) {
    for (const o of world.civs) {
      if (!o.alive || o === c) continue;
      let r = c.relations[o.id] || 0;
      // drift
      r += r > 0 ? -0.3 : 0.3;
      const d = U.dist(c.cx, c.cy, o.cx, o.cy);
      const close = d < 30;
      if (c.allies[o.id]) r += 0.5;
      if (c.traits.includes('peaceful') || c.traits.includes('diplomatic')) r += 0.3;
      if (c.traits.includes('xenophobic')) r -= 0.4;
      if (close) r -= c.personality.aggression * 0.6;
      if (c.traits.some((t) => o.traits.includes(t))) r += 0.2;
      if (c.gov === o.gov) r += 0.15;
      if (Math.abs(c.era - o.era) >= 3) r -= 0.2;
      if (o.fear > 50) r += 0.2; // pity
      if (c.era >= 2 && o.era >= 2 && !c.wars[o.id] && c.personality.trade > 0.4 && Math.random() < 0.5) { r += 0.4; c.gold += 1; o.gold += 1; }
      if (world.flags.worldPeace) r = Math.max(r, 20);
      if (world.flags.worldWar) r = Math.min(r, -50);
      c.relations[o.id] = U.clamp(r, -100, 100);
      const war = c.wars[o.id];
      if (!war) {
        const canReach = close || (c.personality.sea > 0.4 && c.era >= 2) || d < 60 && c.era >= 5;
        if (r < -45 && canReach && c.soldiers >= 3 && Math.random() < c.personality.aggression * 0.25 && (world.tick - c.lastWarTick > 1500 || c.personality.aggression > 0.8) && !world.flags.worldPeace) {
          C.declareWar(world, c, o, U.pick(['border dispute', 'ancient grudge', 'resources', 'insult', 'glory', 'conquest', 'religious zeal', 'a stolen cow']));
        } else if (r > 70 && !c.allies[o.id] && Math.random() < 0.12) C.ally(world, c, o);
      } else {
        const dur = world.tick - war;
        const losing = c.pop < c.maxPop * 0.6 || c.fear > 40;
        if ((dur > 2500 && Math.random() < 0.08) || (losing && Math.random() < 0.15) || (dur > 8000)) C.makePeace(world, c, o);
      }
    }
  }

  function colonize(world, c) {
    if (c.era < 2 || c.pop < 45 || c.boatsOut >= 2 || c.personality.sea < 0.25) return;
    if (Math.random() > 0.35 * c.personality.sea) return;
    // find a port
    let port = null;
    for (const j of c.buildings) { const b = world.buildings.get(j); if (b && b.prog >= 1 && B[b.t].boats) { port = b; break; } }
    if (!port) return;
    // find water tile adjacent to port
    let wx = -1, wy = -1;
    world.neighbors8(port.i, (j, x, y) => { if (wx < 0 && TILES[world.tiles[j]].water) { wx = x; wy = y; } });
    if (wx < 0) return;
    // target: unowned buildable land far from own tiles
    let target = null;
    for (let k = 0; k < 40; k++) {
      const x = U.rint(2, world.w - 3), y = U.rint(2, world.h - 3), i = world.idx(x, y);
      const t = world.tiles[i];
      if (!TILES[t].build || world.owner[i] >= 0 || !world.isCoastal(i)) continue;
      if (t === T.SNOW || t === T.DESERT || t === T.CORRUPT) continue;
      let owned = 0, land = 0, tot = 0;
      world.forRadius(x, y, 4, (xx, yy, j) => { tot++; if (world.owner[j] >= 0) owned++; if (TILES[world.tiles[j]].land) land++; });
      if (owned > 0 || land / tot < 0.45) continue;
      if (U.dist(x, y, c.cx, c.cy) < 15) continue;
      target = { x, y }; break;
    }
    if (!target) return;
    // water tile adjacent to target
    let tx = -1, ty = -1;
    world.neighbors8(world.idx(target.x, target.y), (j, x, y) => { if (tx < 0 && TILES[world.tiles[j]].water) { tx = x; ty = y; } });
    if (tx < 0) return;
    const passengers = 6;
    c.pop -= passengers; c.boatsOut++;
    E.spawn(world, 'boat', wx + 0.5, wy + 0.5, { civ: c.id, ttx: tx + 0.5, tty: ty + 0.5, data: { passengers, mission: 'colonize' } });
    // invasion fleet when at war with an overseas civ
    const warTargets = Object.keys(c.wars).map((k) => world.civs[+k]).filter((o) => o && o.alive && U.dist(o.cx, o.cy, c.cx, c.cy) > 20);
    if (warTargets.length && c.soldiers > 6 && Math.random() < 0.5) {
      const o = U.pick(warTargets);
      let ex = -1, ey = -1;
      world.forRadius(o.cx, o.cy, 6, (x, y, j) => { if (ex < 0 && TILES[world.tiles[j]].water) { ex = x; ey = y; } });
      if (ex >= 0) { c.boatsOut++; E.spawn(world, 'boat', wx + 0.5, wy + 0.5, { civ: c.id, ttx: ex + 0.5, tty: ey + 0.5, data: { passengers: 5, mission: 'invade' } }); c.soldiers -= 5; let n = 0; for (const e of world.entities) { if (!e.dead && e.type === 'soldier' && e.civ === c.id && n < 5) { e.dead = true; e.noFx = true; n++; } } }
    }
  }

  function unrest(world, c) {
    if (c.happiness < 22) c.unrest += (22 - c.happiness) * 0.05; else c.unrest = Math.max(0, c.unrest - 0.3);
    if (c.unrest > 40 && Math.random() < 0.05) {
      c.unrest = 10;
      const r = Math.random();
      if (r < 0.4) { // riot
        const arr = Array.from(c.buildings); if (arr.length) { const j = U.pick(arr); const b = world.buildings.get(j); if (b && !B[b.t].wonder) { world.destroyBuilding(j, true); MB.fx.smoke((j % world.w) + 0.5, ((j / world.w) | 0) + 0.5, 4); } }
        c.pop = Math.max(1, c.pop - 3);
        world.addLog(`Riots break out in ${fullName(c)}!`, 'bad', c.cx, c.cy);
      } else if (r < 0.7) { // revolution
        const govs = C.GOVS_BY_ERA[c.era].filter((g) => g !== c.gov);
        if (govs.length) { const old = fullName(c); c.gov = U.pick(govs); C.newLeader(c, world); c.happiness = 55; world.addLog(`Revolution! ${old} is now ${fullName(c)}.`, 'civ', c.cx, c.cy); c.history.push({ t: world.tick, text: `Revolution: became ${fullName(c)}` }); }
      } else if (c.tiles.size > 40 && c.pop > 50 && world.civs.filter((o) => o.alive).length < world.params.maxCivs + 2) secede(world, c);
      else { c.happiness += 15; }
    }
  }
  function secede(world, c) {
    // farthest owned tile from capital
    let best = -1, bd = -1;
    for (const j of c.tiles) { const d = U.dist(j % world.w, (j / world.w) | 0, c.cx, c.cy); if (d > bd) { bd = d; best = j; } }
    if (best < 0 || bd < 9) return;
    const x = best % world.w, y = (best / world.w) | 0;
    const nc = C.makeCiv(world, x, y, { pop: c.pop * 0.3, era: c.era });
    world.civs.push(nc);
    nc.gov = U.pick(C.GOVS_BY_ERA[nc.era]); C.newLeader(nc, world);
    c.pop *= 0.7;
    world.forRadius(x, y, 7, (xx, yy, j) => {
      if (world.owner[j] === c.id) {
        world.setOwner(j, nc.id);
        const b = world.buildings.get(j); if (b) { c.buildings.delete(j); b.civ = nc.id; nc.buildings.add(j); }
      }
    });
    for (const e of world.entities) if (!e.dead && e.civ === c.id && U.dist(e.x, e.y, x, y) < 7 && e.type !== 'leader') e.civ = nc.id;
    C.refreshTileArr(c); C.refreshTileArr(nc);
    nc.relations[c.id] = -60; c.relations[nc.id] = -60;
    world.addLog(`${fullName(nc)} seceded from ${fullName(c)}!`, 'civ', x, y);
    c.history.push({ t: world.tick, text: `${nc.name} seceded` });
    if (Math.random() < 0.5) C.declareWar(world, c, nc, 'civil war');
  }

  function randomEvent(world, c) {
    const r = Math.random();
    const name = fullName(c);
    if (r < 0.1) { c.goldenAge = 800; world.addLog(`A golden age dawns in ${name}!`, 'good', c.cx, c.cy); }
    else if (r < 0.18) { c.science += C.ERA_COST[c.era] * 0.25; world.addLog(`Scholars of ${name} made a great discovery.`, 'good', c.cx, c.cy); }
    else if (r < 0.25) { c.food *= 0.4; world.addLog(`A bad harvest hits ${name}.`, 'bad', c.cx, c.cy); }
    else if (r < 0.32) { const arr = Array.from(c.buildings); if (arr.length) { const j = U.pick(arr); if (world.moist[j] < 150) { world.ignite(j, 150); world.addLog(`A fire broke out in ${name}!`, 'disaster', j % world.w, (j / world.w) | 0); } } }
    else if (r < 0.4) { c.happiness = Math.min(100, c.happiness + 15); world.addLog(`${name} celebrates a grand festival.`, 'good', c.cx, c.cy); }
    else if (r < 0.46) { // raid
      let bx = -1, by = -1; const arr = c.tileArr; for (let k = 0; k < 10 && arr.length; k++) { const j = arr[(Math.random() * arr.length) | 0]; const x = j % world.w, y = (j / world.w) | 0; if (U.dist(x, y, c.cx, c.cy) > 4) { bx = x; by = y; break; } }
      if (bx >= 0) { E.spawnGroup(world, c.era >= 5 ? 'raider' : 'orc', bx + 0.5, by + 0.5, U.rint(3, 5), 1.5); world.addLog(`Raiders attack the borders of ${name}!`, 'disaster', bx, by); }
    }
    else if (r < 0.52) { c.pop += Math.max(3, c.pop * 0.08); world.addLog(`Migrants arrive in ${name}.`, 'civ', c.cx, c.cy); }
    else if (r < 0.56 && c.era < 6) { C.plague(world, c, 0.6); }
    else if (r < 0.6) { c.gold += 100 + c.era * 50; world.addLog(`${name} discovered a treasure hoard!`, 'good', c.cx, c.cy); }
    else if (r < 0.63) { E.spawn(world, 'hero', c.cx + 0.5, c.cy + 0.5, { civ: c.id, home: { x: c.cx, y: c.cy } }); world.addLog(`A hero rises in ${name}!`, 'good', c.cx, c.cy); }
    else if (r < 0.66) { E.spawn(world, 'prophet', c.cx + 0.5, c.cy + 0.5, { civ: c.id, home: { x: c.cx, y: c.cy } }); world.addLog(`A prophet preaches in ${name}.`, 'civ', c.cx, c.cy); }
    else if (r < 0.7) { C.leaderDied(world, c, U.pick(['old age', 'illness', 'a hunting accident', 'suspicious circumstances', 'a duel'])); }
    else if (r < 0.74) { const m = U.pick(c.era >= 5 ? ['rogue_robot', 'abomination', 'giant_spider'] : ['troll', 'giant', 'werewolf', 'witch', 'wolf']); let bx = c.cx + U.rint(-8, 8), by = c.cy + U.rint(-8, 8); if (world.inb(bx, by) && TILES[world.get(bx, by)].walk) { E.spawn(world, m, bx + 0.5, by + 0.5); world.addLog(`A ${E.DEFS[m].name} was sighted near ${name}.`, 'disaster', bx, by); } }
    else if (r < 0.77 && c.era >= 7 && C.hasBuilding(world, c, 'nuclear_plant') && Math.random() < 0.3) { for (const j of c.buildings) { const b = world.buildings.get(j); if (b && b.t === 'nuclear_plant') { MB.lib.meltdown(world, b.x, b.y); world.addLog(`☢️ Nuclear meltdown in ${name}!`, 'disaster', b.x, b.y); break; } } }
    else if (r < 0.8 && c.era >= 7 && Math.random() < 0.3) { E.spawn(world, 'ufo', c.cx + 0.5, c.cy - 8); world.addLog(`Strange lights over ${name}...`, 'disaster', c.cx, c.cy); }
    else if (r < 0.84) { c.culture += 30; world.addLog(`A renaissance of art blooms in ${name}.`, 'good', c.cx, c.cy); }
    else if (r < 0.87) { c.darkAge = 600; world.addLog(`${name} slips into a dark age.`, 'bad', c.cx, c.cy); }
    else if (r < 0.9) { E.spawnGroup(world, 'trader', c.cx + 0.5, c.cy + 0.5, 1, 1, { civ: -1 }); }
    else if (r < 0.93 && c.era >= 1) { // free building
      const types = Object.keys(B).filter((k) => B[k].era <= c.era && B[k].cat !== 'misc' && !B[k].wonder && !B[k].unique); const t = U.pick(types); const b = C.buildSomewhere(world, c, t, true); if (b) world.addLog(`${name} built a ${B[t].name} with newfound ingenuity.`, 'civ', b.x, b.y);
    }
    else if (r < 0.96) { c.religion = c.religion || U.pick(['the Sun', 'the Sea', 'the Great Tree', 'the Ancestors', 'the Sky Father', 'the Moon Mother', 'the Machine', 'the Void', 'the Rain Bringer', 'the Flame']); c.faith += 20; c.happiness += 5; world.addLog(`${name} embraces the worship of ${c.religion}.`, 'civ', c.cx, c.cy); }
    else { c.happiness -= 10; world.addLog(`Political scandal rocks ${name}.`, 'bad', c.cx, c.cy); }
  }

  function updateAll(world, game) {
    const n = world.civs.length;
    for (let k = 0; k < n; k++) {
      const c = world.civs[k];
      if (!c.alive) continue;
      if ((world.tick + k) % CIV_INTERVAL !== 0) continue;
      updateCiv(world, c, game);
    }
    // world-level: new tribes from wild humans are handled in AI; faith to player
    if (world.tick % 100 === 0) {
      let faith = 0;
      for (const c of world.civs) if (c.alive) { faith += c.faith * 0.01; c.faith *= 0.98; }
      world.faithIncome = faith;
    }
  }

  Object.assign(MB.Civs, { updateAll, updateCiv, computeYields, decideBuild, expand, military, syncHumans, diplomacy, colonize, randomEvent, secede, countType, countCat, CIV_INTERVAL });
})();
