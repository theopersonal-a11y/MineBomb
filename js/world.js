'use strict';
// MineBomb - World: terrain generation, layers, environment simulation, serialization
(function () {
  const U = MB.util, T = MB.T, TILES = MB.TILES;
  const TPS = 20;
  const DAY_TICKS = 1200;          // 60s per day at 1x
  const DAYS_PER_SEASON = 5;
  const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
  const CH = 32;                   // chunk size in tiles
  const SLICES = 40;               // environment processing slices
  const SAVE_VERSION = 3;

  const SIZES = {
    tiny: [96, 64], small: [128, 96], medium: [192, 128], large: [256, 176], huge: [352, 240], colossal: [448, 320],
  };

  class World {
    constructor(params) {
      params = params || {};
      this.id = params.id || U.uid();
      this.name = params.name || 'New World';
      this.seed = (params.seed != null && params.seed !== '') ? (typeof params.seed === 'number' ? params.seed : U.hashStr(String(params.seed))) : Math.floor(Math.random() * 2147483647);
      this.params = {
        size: params.size || 'medium',
        land: params.land != null ? params.land : 0.4,
        shape: params.shape || 'earth',
        climate: params.climate || 'temperate',
        civs: params.civs != null ? params.civs : 6,
        maxCivs: params.maxCivs != null ? params.maxCivs : 12,
        animals: params.animals != null ? params.animals : 1,
        disasters: params.disasters != null ? params.disasters : 1,
      };
      const sz = SIZES[this.params.size] || SIZES.medium;
      this.w = params.w || sz[0];
      this.h = params.h || sz[1];
      this.n = this.w * this.h;
      this.cw = Math.ceil(this.w / CH);
      this.chh = Math.ceil(this.h / CH);
      this.tiles = new Uint8Array(this.n);
      this.height = new Uint8Array(this.n);
      this.moist = new Uint8Array(this.n);
      this.fire = new Uint8Array(this.n);
      this.rad = new Uint8Array(this.n);
      this.poll = new Uint8Array(this.n);
      this.owner = new Int16Array(this.n).fill(-1);
      this.buildings = new Map();
      this.entities = [];
      this.civs = [];
      this.deadCivs = [];
      this.tick = Math.round(DAY_TICKS * 0.34); // start in the morning
      this.created = Date.now();
      this.updated = Date.now();
      this.weather = { type: 'clear', intensity: 0, timer: 600, windX: 0.3, windY: 0.1, lock: null };
      this.log = [];
      this.labels = [];
      this.flags = {};
      this.stats = { days: [], pop: [], civs: [], animals: [], monsters: [] };
      this.burning = new Set();
      this.lavaSet = new Set();
      this.dirty = new Set();
      this.dirtyAll = true;
      this.minimapDirty = true;
      this.seaLevel = 128;
      this.playerStats = { uses: 0, kills: 0, spawns: 0, bombs: 0, rains: 0, abilities: {} };
      this.nextId = 1;
      this.gridCell = 8;
      this.gw = Math.ceil(this.w / this.gridCell);
      this.gh = Math.ceil(this.h / this.gridCell);
      this.grid = new Array(this.gw * this.gh);
      for (let i = 0; i < this.grid.length; i++) this.grid[i] = [];
      this.pendingEvents = [];
      this.shake = 0;
      this.globalMods = { growth: 1, aggression: 1, fertility: 1, science: 1 };
    }

    // ---------- Basic accessors ----------
    idx(x, y) { return y * this.w + x; }
    inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
    get(x, y) { return this.tiles[y * this.w + x]; }
    tileDef(x, y) { return TILES[this.tiles[y * this.w + x]]; }
    isWaterAt(x, y) { return this.inb(x, y) && TILES[this.tiles[y * this.w + x]].water; }
    isLandAt(x, y) { return this.inb(x, y) && TILES[this.tiles[y * this.w + x]].land; }
    isWalkable(x, y) { if (!this.inb(x, y)) return false; return TILES[this.tiles[y * this.w + x]].walk; }
    markDirty(x, y) { this.dirty.add(((y / CH) | 0) * this.cw + ((x / CH) | 0)); this.minimapDirty = true; }
    markDirtyIdx(i) { this.markDirty(i % this.w, (i / this.w) | 0); }
    markAllDirty() { this.dirtyAll = true; this.minimapDirty = true; }

    set(x, y, id) {
      if (!this.inb(x, y)) return;
      this.setIdx(y * this.w + x, id);
    }
    setIdx(i, id) {
      const old = this.tiles[i];
      if (old === id) return;
      this.tiles[i] = id;
      const td = TILES[id];
      if (!td.land || !td.build) {
        // destroy building if ground becomes unbuildable
        if (this.buildings.has(i)) this.destroyBuilding(i, false);
      }
      if (id === T.LAVA || id === T.MAGMA) this.lavaSet.add(i); else if (old === T.LAVA || old === T.MAGMA) this.lavaSet.delete(i);
      if (this.fire[i] && td.flam === 0 && !this.buildings.has(i)) { this.fire[i] = 0; this.burning.delete(i); }
      if (td.water) {
        this.moist[i] = 255;
        if (this.owner[i] >= 0) this.setOwner(i, -1);
      }
      this.markDirtyIdx(i);
    }
    setOwner(i, civId) {
      const old = this.owner[i];
      if (old === civId) return;
      if (old >= 0) { const c = this.civs[old]; if (c) { c.tiles.delete(i); } }
      this.owner[i] = civId;
      if (civId >= 0) { const c = this.civs[civId]; if (c) c.tiles.add(i); }
      // ownership borders change: mark this chunk and neighbor chunks (border lines)
      const x = i % this.w, y = (i / this.w) | 0;
      this.markDirty(x, y);
      if (x % CH === 0) this.markDirty(x - 1, y);
      if (x % CH === CH - 1) this.markDirty(x + 1, y);
      if (y % CH === 0) this.markDirty(x, y - 1);
      if (y % CH === CH - 1) this.markDirty(x, y + 1);
    }
    civAt(x, y) {
      if (!this.inb(x, y)) return null;
      const o = this.owner[y * this.w + x];
      return o >= 0 ? (this.civs[o] || null) : null;
    }
    buildingAt(x, y) { return this.inb(x, y) ? this.buildings.get(y * this.w + x) || null : null; }

    forRadius(cx, cy, r, fn) {
      const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(this.w - 1, Math.ceil(cx + r));
      const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(this.h - 1, Math.ceil(cy + r));
      const r2 = r * r;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
          if (d2 <= r2) fn(x, y, y * this.w + x, Math.sqrt(d2));
        }
      }
    }
    forRect(x0, y0, x1, y1, fn) {
      x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(this.w - 1, x1); y1 = Math.min(this.h - 1, y1);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fn(x, y, y * this.w + x);
    }
    neighbors4(i, fn) {
      const x = i % this.w, y = (i / this.w) | 0;
      if (x > 0) fn(i - 1, x - 1, y);
      if (x < this.w - 1) fn(i + 1, x + 1, y);
      if (y > 0) fn(i - this.w, x, y - 1);
      if (y < this.h - 1) fn(i + this.w, x, y + 1);
    }
    neighbors8(i, fn) {
      const x = i % this.w, y = (i / this.w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < this.w && ny < this.h) fn(ny * this.w + nx, nx, ny);
      }
    }
    isCoastal(i) {
      let c = false;
      this.neighbors4(i, (j) => { if (TILES[this.tiles[j]].water) c = true; });
      return c;
    }
    countNear(x, y, r, pred) {
      let c = 0;
      this.forRadius(x, y, r, (xx, yy, i) => { if (pred(this.tiles[i], i)) c++; });
      return c;
    }
    randomTile(pred, tries = 200) {
      for (let k = 0; k < tries; k++) {
        const x = U.rint(0, this.w - 1), y = U.rint(0, this.h - 1), i = y * this.w + x;
        if (pred(this.tiles[i], i, x, y)) return i;
      }
      return -1;
    }
    tempAt(x, y) {
      const lat = Math.abs(y / this.h - 0.5) * 2;
      let t = 1.05 - lat * 1.15;
      const clim = this.params.climate;
      if (clim === 'hot') t += 0.25; else if (clim === 'cold') t -= 0.25; else if (clim === 'tropical') t += 0.4; else if (clim === 'frozen') t -= 0.5;
      const i = y * this.w + x;
      const hl = Math.max(0, (this.height[i] - this.seaLevel) / (255 - this.seaLevel));
      t -= hl * 0.45;
      t += (U.hash2(x, y, this.seed) - 0.5) * 0.12;
      if (this.flags.iceAge) t -= 0.35;
      if (this.flags.warming) t += 0.25;
      return U.clamp(t, 0, 1);
    }
    season() { return SEASONS[Math.floor(this.tick / DAY_TICKS / DAYS_PER_SEASON) % 4]; }
    seasonIndex() { return Math.floor(this.tick / DAY_TICKS / DAYS_PER_SEASON) % 4; }
    day() { return Math.floor(this.tick / DAY_TICKS); }
    year() { return Math.floor(this.day() / (DAYS_PER_SEASON * 4)) + 1; }
    hour() { return ((this.tick % DAY_TICKS) / DAY_TICKS) * 24; }
    daylight() {
      // 0 at midnight, 1 at noon
      const h = this.hour();
      let d = 0.5 - 0.5 * Math.cos((h / 24) * Math.PI * 2);
      if (this.flags.eternalNight) d = 0.05;
      if (this.flags.eternalDay) d = 1;
      return d;
    }
    isRainingAt(i) {
      if (this.weather.type === 'rain' || this.weather.type === 'storm' || this.weather.type === 'monsoon') return true;
      return this.rainMask ? this.rainMask.has(i) : false;
    }

    // ---------- Logging ----------
    addLog(text, kind = 'info', x = null, y = null) {
      const e = { t: this.tick, text, kind, x, y, day: this.day(), year: this.year() };
      this.log.push(e);
      if (this.log.length > 400) this.log.splice(0, this.log.length - 400);
      this.pendingEvents.push(e);
    }

    // ---------- Entities ----------
    addEntity(e) {
      e.id = this.nextId++;
      this.entities.push(e);
      return e;
    }
    rebuildGrid() {
      const g = this.grid;
      for (let i = 0; i < g.length; i++) g[i].length = 0;
      const cs = this.gridCell;
      const counts = { animal: 0, monster: 0, human: 0, mythic: 0, special: 0 };
      for (const e of this.entities) {
        if (e.dead) continue;
        counts[e.kind] = (counts[e.kind] || 0) + 1;
        const gx = U.clamp((e.x / cs) | 0, 0, this.gw - 1), gy = U.clamp((e.y / cs) | 0, 0, this.gh - 1);
        g[gy * this.gw + gx].push(e);
      }
      this.counts = counts;
    }
    animalCap() { return Math.floor(this.n / 60 * (this.params.animals || 1)) + 60; }
    near(x, y, r, fn) {
      // iterate entities within radius r of (x, y); fn(e, dist) ; return true from fn to stop
      const cs = this.gridCell;
      const gx0 = U.clamp(((x - r) / cs) | 0, 0, this.gw - 1), gx1 = U.clamp(((x + r) / cs) | 0, 0, this.gw - 1);
      const gy0 = U.clamp(((y - r) / cs) | 0, 0, this.gh - 1), gy1 = U.clamp(((y + r) / cs) | 0, 0, this.gh - 1);
      const r2 = r * r;
      for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
        const cell = this.grid[gy * this.gw + gx];
        for (let k = 0; k < cell.length; k++) {
          const e = cell[k];
          if (e.dead) continue;
          const dx = e.x - x, dy = e.y - y, d2 = dx * dx + dy * dy;
          if (d2 <= r2) { if (fn(e, Math.sqrt(d2)) === true) return; }
        }
      }
    }
    nearest(x, y, r, pred) {
      let best = null, bd = Infinity;
      this.near(x, y, r, (e, d) => { if (d < bd && (!pred || pred(e))) { bd = d; best = e; } });
      return best;
    }
    countEntities(pred) {
      let c = 0;
      for (const e of this.entities) if (!e.dead && (!pred || pred(e))) c++;
      return c;
    }

    // ---------- Buildings ----------
    destroyBuilding(i, toRuins = true) {
      const b = this.buildings.get(i);
      if (!b) return;
      this.buildings.delete(i);
      const civ = this.civs[b.civ];
      if (civ) { civ.buildings.delete(i); civ.lastBuildingLoss = this.tick; }
      if (toRuins && TILES[this.tiles[i]].land && TILES[this.tiles[i]].build) {
        this.tiles[i] = T.RUINS;
      }
      this.markDirtyIdx(i);
    }

    // ---------- Fire ----------
    ignite(i, amount = 120) {
      const td = TILES[this.tiles[i]];
      if (!td.land) return false;
      if (td.flam <= 0 && !this.buildings.has(i)) return false;
      if (this.flags.fireproof) return false;
      this.fire[i] = Math.max(this.fire[i], Math.min(255, amount));
      this.burning.add(i);
      return true;
    }
    extinguish(i) { if (this.fire[i]) { this.fire[i] = 0; this.burning.delete(i); } }

    // ============ GENERATION ============
    generate() {
      const rng = new U.RNG(this.seed);
      const noise = new U.Simplex(rng);
      const noise2 = new U.Simplex(rng);
      const noise3 = new U.Simplex(rng);
      const w = this.w, h = this.h, p = this.params;
      const scale = 1 / (Math.max(w, h) * 0.22);

      // island mask blobs
      const blobs = [];
      const shape = p.shape;
      let count, rmin, rmax;
      if (shape === 'pangea') { count = 1; rmin = 0.42; rmax = 0.46; }
      else if (shape === 'continents') { count = rng.int(2, 3); rmin = 0.22; rmax = 0.32; }
      else if (shape === 'archipelago') { count = rng.int(14, 22); rmin = 0.05; rmax = 0.12; }
      else if (shape === 'ring') { count = 10; rmin = 0.1; rmax = 0.14; }
      else { count = rng.int(5, 8); rmin = 0.12; rmax = 0.26; } // earth
      for (let k = 0; k < count; k++) {
        let bx, by;
        if (shape === 'ring') { const a = (k / count) * Math.PI * 2; bx = 0.5 + Math.cos(a) * 0.3; by = 0.5 + Math.sin(a) * 0.3; }
        else if (shape === 'pangea') { bx = 0.5; by = 0.5; }
        else { bx = rng.float(0.12, 0.88); by = rng.float(0.12, 0.88); }
        blobs.push({ x: bx, y: by, r: rng.float(rmin, rmax), rx: rng.float(0.7, 1.4) });
      }
      const raw = new Float32Array(this.n);
      const moistRaw = new Float32Array(this.n);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const nx = x / w, ny = y / h;
          let mask = 0;
          for (const b of blobs) {
            const dx = (nx - b.x) * b.rx, dy = (ny - b.y) / b.rx;
            const d = Math.sqrt(dx * dx + dy * dy) / b.r;
            const v = Math.exp(-d * d * 1.6);
            if (v > mask) mask = v;
          }
          const e = noise.fbm(x * scale, y * scale, 6, 2.0, 0.5) * 0.5 + 0.5;    // 0..1
          const detail = noise3.fbm(x * scale * 4, y * scale * 4, 3) * 0.5 + 0.5;
          let hv = e * 0.55 + mask * 0.75 + detail * 0.15 - 0.2;
          // edge falloff
          const ex = Math.min(nx, 1 - nx), ey = Math.min(ny, 1 - ny);
          const edge = U.clamp(Math.min(ex, ey) / 0.08, 0, 1);
          hv *= U.smoothstep(edge) * 0.85 + 0.15;
          raw[y * w + x] = hv;
          moistRaw[y * w + x] = noise2.fbm(x * scale * 1.5 + 100, y * scale * 1.5 + 100, 4) * 0.5 + 0.5;
        }
      }
      // sea level by quantile
      const sample = [];
      for (let i = 0; i < this.n; i += 7) sample.push(raw[i]);
      sample.sort((a, b) => a - b);
      const sl = sample[Math.floor(sample.length * (1 - U.clamp(p.land, 0.05, 0.95)))];
      // normalize heights to 0..255 with sea level at 128
      for (let i = 0; i < this.n; i++) {
        const v = raw[i];
        let hv;
        if (v < sl) hv = 128 * U.clamp(v / Math.max(sl, 1e-6), 0, 1);
        else hv = 128 + 127 * U.clamp((v - sl) / Math.max(1 - sl, 1e-6), 0, 1);
        this.height[i] = Math.round(hv);
        this.moist[i] = Math.round(U.clamp(moistRaw[i], 0, 1) * 255);
      }
      this.seaLevel = 128;
      // classify
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) this.tiles[y * w + x] = this.classify(x, y, true);
      // rivers
      const riverCount = Math.floor(this.n / 3500) + 1;
      for (let k = 0; k < riverCount * 3; k++) {
        const i = this.randomTile((t, idx) => this.height[idx] > 190 && TILES[t].land, 300);
        if (i < 0) continue;
        this.carveRiver(i, rng);
      }
      // beaches
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const t = this.tiles[i];
        if (TILES[t].land && this.height[i] < 140 && (t === T.GRASS || t === T.SAVANNA || t === T.FOREST || t === T.DESERT) && this.isCoastal(i)) {
          if (this.tempAt(x, y) > 0.3) this.tiles[i] = T.SAND;
        }
      }
      // ores, caves, specials
      for (let i = 0; i < this.n; i++) {
        const t = this.tiles[i];
        const r = rng.next();
        if (t === T.HILLS) {
          if (r < 0.02) this.tiles[i] = T.GOLD;
          else if (r < 0.07) this.tiles[i] = T.IRON;
          else if (r < 0.11) this.tiles[i] = T.COAL;
          else if (r < 0.115) this.tiles[i] = T.DIAMOND;
          else if (r < 0.15) this.tiles[i] = T.CAVE;
        } else if (t === T.MOUNTAIN) {
          if (r < 0.01) this.tiles[i] = T.GOLD;
          else if (r < 0.03) this.tiles[i] = T.IRON;
          else if (r < 0.035) this.tiles[i] = T.DIAMOND;
        } else if (t === T.SHALLOW) {
          if (r < 0.03 && this.tempAt(i % w, (i / w) | 0) > 0.55) this.tiles[i] = T.REEF;
        } else if (t === T.DESERT) {
          if (r < 0.004) this.tiles[i] = T.OIL;
          else if (r < 0.012) this.tiles[i] = T.REDSAND;
        } else if (t === T.TUNDRA) {
          if (r < 0.004) this.tiles[i] = T.GEYSER;
          else if (r < 0.007) this.tiles[i] = T.CRYSTAL;
        } else if (t === T.SWAMP) {
          if (r < 0.03) this.tiles[i] = T.MUSHROOM;
          else if (r < 0.035) this.tiles[i] = T.TAR;
        } else if (t === T.GRASS) {
          if (r < 0.015) this.tiles[i] = T.FLOWERS;
        } else if (t === T.FOREST) {
          if (r < 0.01) this.tiles[i] = T.MUSHROOM;
        }
      }
      // cluster flowers/mushrooms a bit
      for (let i = 0; i < this.n; i++) {
        const t = this.tiles[i];
        if (t === T.FLOWERS || t === T.MUSHROOM) {
          this.neighbors4(i, (j) => { if (rng.chance(0.35) && (this.tiles[j] === T.GRASS || (t === T.MUSHROOM && this.tiles[j] === T.FOREST))) this.tiles[j] = t; });
        }
      }
      // starting civs
      const civ = MB.Civs;
      const spots = this.findCivSpots(p.civs, rng);
      for (const s of spots) civ.found(this, s.x, s.y, { era: 0, pop: 14, rng });
      // animals
      MB.Entities.populateAnimals(this, Math.floor(this.n / 110 * p.animals));
      this.addLog(`The world of ${this.name} was born. ${this.civs.length} tribes awaken.`, 'world');
      this.markAllDirty();
    }

    classify(x, y, gen = false) {
      const i = y * this.w + x;
      const hv = this.height[i];
      if (hv < 70) return T.DEEP;
      if (hv < 112) return T.WATER;
      if (hv < 128) return T.SHALLOW;
      const hl = (hv - 128) / 127;           // 0..1 above sea
      const m = this.moist[i] / 255;
      const t = this.tempAt(x, y);
      if (hl > 0.8) return T.MOUNTAIN;
      if (hl > 0.62) return T.HILLS;
      if (t < 0.17) return hl < 0.04 && !gen ? T.SNOW : T.SNOW;
      if (t < 0.32) return T.TUNDRA;
      if (t > 0.82 && m < 0.36) return T.DESERT;
      if (t > 0.74 && m < 0.5) return T.SAVANNA;
      if (m > 0.74 && t > 0.62) return T.JUNGLE;
      if (m > 0.6) return T.FOREST;
      if (m > 0.52 && hl < 0.08 && t > 0.45) return T.SWAMP;
      if (m < 0.28 && hl < 0.05) return T.SAND;
      return T.GRASS;
    }

    carveRiver(start, rng) {
      let i = start;
      let len = 0;
      const visited = new Set();
      while (len < 120) {
        visited.add(i);
        const x = i % this.w, y = (i / this.w) | 0;
        if (TILES[this.tiles[i]].water) break;
        this.tiles[i] = T.SHALLOW;
        this.height[i] = Math.min(this.height[i], 127);
        // moisten surroundings
        this.forRadius(x, y, 3, (xx, yy, j) => { this.moist[j] = Math.min(255, this.moist[j] + 25); });
        // find lowest neighbor
        let best = -1, bh = Infinity;
        this.neighbors8(i, (j) => {
          if (visited.has(j)) return;
          const hh = this.height[j] + rng.float(0, 12);
          if (hh < bh) { bh = hh; best = j; }
        });
        if (best < 0) break;
        i = best;
        len++;
      }
    }

    findCivSpots(count, rng) {
      const cands = [];
      for (let k = 0; k < 4000 && cands.length < 400; k++) {
        const x = rng.int(4, this.w - 5), y = rng.int(4, this.h - 5), i = y * this.w + x;
        const t = this.tiles[i];
        if (t !== T.GRASS && t !== T.SAVANNA && t !== T.FLOWERS && t !== T.FOREST) continue;
        let land = 0, water = 0, total = 0, fert = 0;
        this.forRadius(x, y, 4, (xx, yy, j) => { total++; const td = TILES[this.tiles[j]]; if (td.land) land++; else water++; fert += td.fert; });
        if (land / total < 0.6) continue;
        const score = fert + (water > 0 ? 6 : 0) + rng.float(0, 4);
        cands.push({ x, y, score });
      }
      cands.sort((a, b) => b.score - a.score);
      const chosen = [];
      const minD = Math.max(12, Math.min(this.w, this.h) / Math.max(2, Math.sqrt(count) * 1.6));
      for (const c of cands) {
        if (chosen.length >= count) break;
        if (chosen.every((o) => U.dist(o.x, o.y, c.x, c.y) > minD)) chosen.push(c);
      }
      if (chosen.length < count) for (const c of cands) { if (chosen.length >= count) break; if (!chosen.includes(c) && chosen.every((o) => U.dist(o.x, o.y, c.x, c.y) > 6)) chosen.push(c); }
      return chosen;
    }

    // ============ SIMULATION ============
    step(game) {
      this.tick++;
      this.rebuildGrid();
      this.updateWeather();
      this.environmentSlice();
      if (this.tick % 2 === 0) this.fireTick();
      if (this.tick % 5 === 0) this.lavaTick();
      MB.Entities.updateAll(this, game);
      MB.Civs.updateAll(this, game);
      if (this.tick % 100 === 0) this.naturalSpawns();
      if (this.tick % 700 === 0) this.maybeNewCiv();
      if (this.tick % DAY_TICKS === 0) this.recordStats();
      if (this.tick % 400 === 0 && this.params.disasters > 0) this.randomDisaster(game);
      if (this.tick % 20 === 0) this.compactEntities();
      // Rain masks from clouds are rebuilt by entities each tick
    }

    compactEntities() {
      let j = 0;
      const arr = this.entities;
      for (let i = 0; i < arr.length; i++) if (!arr[i].dead) arr[j++] = arr[i];
      arr.length = j;
    }

    recordStats() {
      let pop = 0, alive = 0;
      for (const c of this.civs) if (c.alive) { pop += c.pop; alive++; }
      const s = this.stats;
      s.days.push(this.day()); s.pop.push(Math.round(pop)); s.civs.push(alive);
      s.animals.push(this.countEntities((e) => e.kind === 'animal'));
      s.monsters.push(this.countEntities((e) => e.kind === 'monster'));
      if (s.days.length > 400) for (const k in s) s[k].splice(0, s[k].length - 400);
    }

    updateWeather() {
      const wth = this.weather;
      wth.timer--;
      // wind drift
      if (this.tick % 40 === 0) {
        wth.windX = U.clamp(wth.windX + U.rfloat(-0.08, 0.08), -0.6, 0.6);
        wth.windY = U.clamp(wth.windY + U.rfloat(-0.08, 0.08), -0.6, 0.6);
      }
      if (wth.timer <= 0) {
        if (wth.lock) { wth.type = wth.lock; wth.timer = 2000; }
        else {
          const s = this.seasonIndex();
          const r = Math.random();
          let type;
          if (this.flags.permaStorm) type = 'storm';
          else if (s === 0) type = r < 0.35 ? 'rain' : r < 0.75 ? 'clear' : r < 0.9 ? 'cloudy' : r < 0.97 ? 'storm' : 'fog';
          else if (s === 1) type = r < 0.5 ? 'clear' : r < 0.65 ? 'heat' : r < 0.82 ? 'rain' : r < 0.95 ? 'storm' : 'cloudy';
          else if (s === 2) type = r < 0.3 ? 'cloudy' : r < 0.6 ? 'rain' : r < 0.85 ? 'clear' : r < 0.95 ? 'fog' : 'windy';
          else type = r < 0.4 ? 'snow' : r < 0.7 ? 'clear' : r < 0.9 ? 'cloudy' : 'storm';
          if (this.flags.iceAge && (type === 'rain' || type === 'heat')) type = 'snow';
          if (this.globalPollution() > 0.5 && type === 'rain' && Math.random() < 0.5) type = 'acid';
          wth.type = type;
          wth.timer = U.rint(600, 2400);
        }
        wth.intensity = U.rfloat(0.5, 1);
      }
      if (wth.type === 'storm' && this.tick % 30 === 0 && Math.random() < 0.6) {
        const i = this.randomTile((t) => TILES[t].land, 20);
        if (i >= 0) this.lightningStrike(i % this.w, (i / this.w) | 0, 0.6);
      }
    }
    globalPollution() {
      if (this.tick % 200 === 0 || this._pollCache == null) {
        let s = 0;
        for (let i = 0; i < this.n; i += 3) s += this.poll[i];
        this._pollCache = s / (this.n / 3) / 80;
      }
      return U.clamp(this._pollCache, 0, 1);
    }
    lightningStrike(x, y, power = 1, silent = false) {
      const i = this.idx(x, y);
      if (TILES[this.tiles[i]].land && this.moist[i] < 140 && Math.random() < 0.6 * power) this.ignite(i, 150);
      this.near(x + 0.5, y + 0.5, 1.5, (e) => { if (!e.immortal) MB.Entities.damage(this, e, 60 * power, 'lightning'); });
      const b = this.buildings.get(i);
      if (b && !b.shielded) { b.hp -= 50 * power; if (b.hp <= 0) this.destroyBuilding(i, true); }
      if (!silent) MB.fx.lightning(x, y);
    }

    environmentSlice() {
      const slice = this.tick % SLICES;
      const w = this.w, n = this.n;
      const wth = this.weather;
      const raining = wth.type === 'rain' || wth.type === 'storm' || wth.type === 'monsoon';
      const acid = wth.type === 'acid';
      const snowing = wth.type === 'snow';
      const heat = wth.type === 'heat' || this.flags.warming;
      const rainMask = this.rainMask;
      const fertMod = this.globalMods.fertility;
      for (let i = slice; i < n; i += SLICES) {
        const t = this.tiles[i];
        const td = TILES[t];
        let m = this.moist[i];
        if (td.water) { this.moist[i] = 255; }
        else {
          if (raining || acid) m += 6; else if (snowing) m += 2;
          if (rainMask && rainMask.has(i)) m += 14;
          m -= heat ? 4 : (t === T.DESERT || t === T.SAVANNA || t === T.REDSAND) ? 2 : 1;
          // nearby water keeps things moist
          if (m < 60 && this.isCoastal(i)) m += 1;
          m = m < 0 ? 0 : m > 255 ? 255 : m;
          this.moist[i] = m;
        }
        // radiation decay
        if (this.rad[i] > 0 && Math.random() < 0.5) this.rad[i]--;
        // pollution
        if (this.poll[i] > 0) {
          if (Math.random() < 0.3) this.poll[i]--;
          if (this.poll[i] > 40 && Math.random() < 0.3) {
            const j = Math.random() < 0.5 ? i + 1 : i + w;
            if (j < n && TILES[this.tiles[j]].land && this.poll[j] < this.poll[i]) { this.poll[j] += 2; this.poll[i] -= 2; }
          }
          if (this.poll[i] > 120 && t === T.GRASS && Math.random() < 0.01) this.setIdx(i, T.WASTE);
        }
        // growth & decay
        const r = Math.random();
        const x = i % w, y = (i / w) | 0;
        if (this.flags.frozenNature) continue;
        switch (t) {
          case T.ASH: if (m > 90 && r < 0.03 * fertMod) this.setIdx(i, T.GRASS); break;
          case T.MUD: if (m > 110 && r < 0.03 * fertMod) this.setIdx(i, T.GRASS); else if (m < 40 && r < 0.01) this.setIdx(i, T.WASTE); break;
          case T.WASTE: if (m > 170 && r < 0.02 * fertMod) this.setIdx(i, T.MUD); break;
          case T.CRATER: if (m > 160 && r < 0.01 * fertMod) this.setIdx(i, T.WASTE); break;
          case T.SAND: if (m > 235 && r < 0.02 * fertMod && !this.isCoastal(i)) this.setIdx(i, T.GRASS); break;
          case T.DESERT: if (m > 180 && r < 0.015 * fertMod) this.setIdx(i, T.SAVANNA); break;
          case T.REDSAND: if (m > 200 && r < 0.01 * fertMod) this.setIdx(i, T.SAVANNA); break;
          case T.SALT: if (m > 220 && r < 0.01) this.setIdx(i, T.MUD); break;
          case T.SAVANNA:
            if (m > 170 && r < 0.012 * fertMod) this.setIdx(i, T.GRASS);
            else if (m < 12 && this.tempAt(x, y) > 0.75 && r < 0.004) this.setIdx(i, T.DESERT);
            break;
          case T.GRASS:
            if (m > 200 && r < 0.004 * fertMod) {
              let forestNear = false;
              this.neighbors4(i, (j) => { if (this.tiles[j] === T.FOREST || this.tiles[j] === T.JUNGLE) forestNear = true; });
              if (forestNear || r < 0.0006) this.setIdx(i, this.tempAt(x, y) > 0.7 && m > 230 ? T.JUNGLE : T.FOREST);
            } else if (m < 10 && this.tempAt(x, y) > 0.7 && r < 0.003) this.setIdx(i, T.SAVANNA);
            else if (acid && r < 0.003) this.setIdx(i, T.SAVANNA);
            else if (this.rad[i] > 120 && r < 0.01) this.setIdx(i, T.WASTE);
            break;
          case T.FOREST: case T.JUNGLE:
            if (m < 15 && heat && r < 0.0015 && !this.flags.fireproof) this.ignite(i, 100);
            if (acid && r < 0.002) this.setIdx(i, T.GRASS);
            break;
          case T.RUINS: if (this.owner[i] < 0 && m > 100 && r < 0.004) this.setIdx(i, T.GRASS); break;
          case T.CORRUPT:
            if (r < 0.012 && !this.flags.purified) {
              const dirs = [i - 1, i + 1, i - w, i + w];
              const j = dirs[(Math.random() * 4) | 0];
              if (j >= 0 && j < n && Math.abs((j % w) - x) <= 1) {
                const tj = this.tiles[j];
                if (TILES[tj].land && tj !== T.CORRUPT && tj !== T.HOLY && tj !== T.VOID && tj !== T.BEDROCK) this.setIdx(j, T.CORRUPT);
              }
            }
            if (r > 0.9995 && this.countEntities((e) => e.kind === 'monster') < 150) MB.Entities.spawn(this, U.pick(['zombie', 'skeleton', 'imp', 'slime']), x + 0.5, y + 0.5);
            break;
          case T.HOLY:
            if (r < 0.03) this.neighbors4(i, (j) => { if (this.tiles[j] === T.CORRUPT) this.setIdx(j, T.GRASS); });
            break;
          case T.ICE: if (this.tempAt(x, y) > 0.55 && r < 0.004 && !this.flags.iceAge) this.setIdx(i, T.MUD); break;
          case T.FROZEN: if (this.tempAt(x, y) > 0.45 && r < 0.004 && !this.flags.iceAge) this.setIdx(i, T.WATER); break;
          case T.SHALLOW: case T.WATER:
            if (this.flags.iceAge && this.tempAt(x, y) < 0.5 && r < 0.01) this.setIdx(i, T.FROZEN);
            break;
          case T.SLIME: if (r < 0.0005) MB.Entities.spawn(this, 'slime', x + 0.5, y + 0.5); if (r > 0.995) this.setIdx(i, T.SWAMP); break;
          case T.BONE: if (r < 0.0004 && this.countEntities((e) => e.kind === 'monster') < 150) MB.Entities.spawn(this, 'skeleton', x + 0.5, y + 0.5); break;
          case T.GRAVE: if (r < 0.0004 && this.daylight() < 0.3) MB.Entities.spawn(this, 'zombie', x + 0.5, y + 0.5); break;
          case T.MAGMA: if (r < 0.004) this.setIdx(i, T.OBSIDIAN); break;
          case T.GEYSER: if (r < 0.02) MB.fx.steam(x + 0.5, y + 0.5); break;
          case T.CANDY: if (r < 0.0003) MB.Entities.spawn(this, 'gingerbread', x + 0.5, y + 0.5); break;
        }
      }
    }

    fireTick() {
      if (this.burning.size === 0) return;
      const w = this.w, n = this.n;
      const wet = this.weather.type === 'rain' || this.weather.type === 'storm' || this.weather.type === 'snow' || this.weather.type === 'monsoon';
      const toRemove = [];
      for (const i of this.burning) {
        let f = this.fire[i];
        const t = this.tiles[i], td = TILES[t];
        const rainHere = wet || (this.rainMask && this.rainMask.has(i));
        f -= rainHere ? 14 : (td.flam > 0.6 ? 3 : 6);
        if (this.moist[i] > 200) f -= 3;
        this.moist[i] = Math.max(0, this.moist[i] - 6);
        // spread
        const dry = 1 - this.moist[i] / 300;
        const spreadP = (td.flam * 0.22 + (this.buildings.has(i) ? 0.08 : 0)) * dry * (this.weather.type === 'windy' || this.weather.type === 'heat' ? 1.6 : 1);
        if (Math.random() < spreadP) {
          const dirs = [i - 1, i + 1, i - w, i + w];
          const j = dirs[(Math.random() * 4) | 0];
          if (j >= 0 && j < n && Math.abs((j % w) - (i % w)) <= 1 && !this.fire[j]) {
            const tj = TILES[this.tiles[j]];
            if ((tj.flam > 0 || this.buildings.has(j)) && this.moist[j] < 230) this.ignite(j, 100 + Math.random() * 60);
          }
        }
        // damage building
        const b = this.buildings.get(i);
        if (b && !b.shielded) {
          b.hp -= 3 + Math.random() * 3;
          if (b.hp <= 0) { this.destroyBuilding(i, true); MB.fx.smoke(i % w + 0.5, ((i / w) | 0) + 0.5, 3); }
        }
        if (f <= 0) {
          toRemove.push(i);
          this.fire[i] = 0;
          if (MB.tiles.BURNABLE.has(t)) this.setIdx(i, t === T.OIL ? T.WASTE : T.ASH);
          else this.markDirtyIdx(i);
        } else this.fire[i] = f;
      }
      for (const i of toRemove) this.burning.delete(i);
    }

    lavaTick() {
      if (this.lavaSet.size === 0) return;
      const toCool = [], toFlow = [];
      for (const i of this.lavaSet) {
        const x = i % this.w, y = (i / this.w) | 0;
        let waterNear = false;
        this.neighbors4(i, (j) => {
          const tj = this.tiles[j];
          const tdj = TILES[tj];
          if (tdj.water) waterNear = true;
          else if ((tdj.flam > 0 || this.buildings.has(j)) && Math.random() < 0.08) this.ignite(j, 140);
        });
        if (waterNear && Math.random() < 0.15) { toCool.push(i); MB.fx.steam(x + 0.5, y + 0.5); }
        else if (Math.random() < 0.004) toCool.push(i);
        else if (this.lavaSet.size < 300 && Math.random() < 0.012) { // lava flows downhill
          let best = -1, bh = this.height[i];
          this.neighbors4(i, (j) => { const tj = this.tiles[j]; if (TILES[tj].land && tj !== T.LAVA && tj !== T.BEDROCK && tj !== T.VOID && this.height[j] <= bh) { bh = this.height[j]; best = j; } });
          if (best >= 0) toFlow.push(best);
        }
        if (Math.random() < 0.03) MB.fx.ember(x + Math.random(), y + Math.random());
        // kill entities on lava
        this.near(x + 0.5, y + 0.5, 0.8, (e) => { if (e.habitat !== 'air' && !e.fireproof && !e.immortal) MB.Entities.damage(this, e, 25, 'lava'); });
      }
      for (const i of toCool) this.setIdx(i, T.OBSIDIAN);
      for (const i of toFlow) this.setIdx(i, T.LAVA);
    }

    naturalSpawns() {
      const cap = Math.floor(this.animalCap() * 0.6);
      const animals = this.counts ? this.counts.animal : this.countEntities((e) => e.kind === 'animal');
      if (animals < cap) MB.Entities.populateAnimals(this, Math.min(6, cap - animals));
      if (this.flags.monsterSpawns && Math.random() < 0.4) {
        const i = this.randomTile((t) => TILES[t].land && TILES[t].walk, 40);
        if (i >= 0) MB.Entities.spawn(this, U.pick(['zombie', 'skeleton', 'slime', 'wolf', 'imp']), (i % this.w) + 0.5, ((i / this.w) | 0) + 0.5);
      }
    }

    maybeNewCiv() {
      const alive = this.civs.filter((c) => c.alive).length;
      if (alive >= this.params.maxCivs) return;
      if (this.flags.noNewCivs) return;
      if (Math.random() > 0.45) return;
      for (let k = 0; k < 60; k++) {
        const x = U.rint(3, this.w - 4), y = U.rint(3, this.h - 4), i = y * this.w + x;
        const t = this.tiles[i];
        if (t !== T.GRASS && t !== T.SAVANNA && t !== T.FLOWERS && t !== T.FOREST && t !== T.TUNDRA) continue;
        if (this.owner[i] >= 0) continue;
        let ok = true;
        this.forRadius(x, y, 9, (xx, yy, j) => { if (this.owner[j] >= 0) ok = false; });
        if (!ok) continue;
        let land = 0, tot = 0;
        this.forRadius(x, y, 3, (xx, yy, j) => { tot++; if (TILES[this.tiles[j]].land && TILES[this.tiles[j]].walk) land++; });
        if (land / tot < 0.6) continue;
        const c = MB.Civs.found(this, x, y, { era: 0, pop: 10 });
        if (c) this.addLog(`A new tribe, ${c.name}, has settled in the wilds.`, 'civ', x, y);
        return;
      }
    }

    randomDisaster(game) {
      if (Math.random() > 0.12 * this.params.disasters) return;
      const r = Math.random();
      const i = this.randomTile((t) => TILES[t].land, 30);
      if (i < 0) return;
      const x = i % this.w, y = (i / this.w) | 0;
      if (r < 0.3) { MB.Entities.spawn(this, 'tornado', x + 0.5, y + 0.5, { life: 500 }); this.addLog('A tornado touches down!', 'disaster', x, y); }
      else if (r < 0.45) { MB.Entities.spawn(this, 'meteor', x + 0.5, y - 30, { ttx: x + 0.5, tty: y + 0.5, power: 4 }); this.addLog('A meteor streaks across the sky!', 'disaster', x, y); }
      else if (r < 0.6) { if (this.moist[i] < 120) { this.ignite(i, 150); this.addLog('A wildfire breaks out!', 'disaster', x, y); } }
      else if (r < 0.75) { MB.lib.earthquake(this, x, y, 7, 0.6); this.addLog('The ground trembles - an earthquake!', 'disaster', x, y); }
      else if (r < 0.85) { const c = this.civAt(x, y); if (c && c.alive && c.pop > 40) MB.Civs.plague(this, c, 0.3); }
      else if (r < 0.95) { MB.Entities.spawn(this, U.pick(['zombie', 'wolf', 'bear', 'giant']), x + 0.5, y + 0.5); }
      else { MB.Entities.spawn(this, 'dragon', x + 0.5, y + 0.5); this.addLog('A dragon has awakened!', 'disaster', x, y); }
    }

    // ============ SERIALIZATION ============
    serialize() {
      const civs = this.civs.map((c) => MB.Civs.serialize(c));
      const buildings = [];
      for (const b of this.buildings.values()) buildings.push([b.i, b.t, b.civ, Math.round(b.hp), Math.round(b.prog * 100) / 100, b.lvl || 0]);
      const entities = [];
      for (const e of this.entities) if (!e.dead && !e.noSave) entities.push(MB.Entities.serialize(e));
      return {
        v: SAVE_VERSION, id: this.id, name: this.name, seed: this.seed, params: this.params,
        w: this.w, h: this.h, created: this.created, updated: Date.now(), tick: this.tick,
        seaLevel: this.seaLevel,
        layers: {
          tiles: U.rleEncode(this.tiles), height: U.rleEncode(this.height), moist: U.rleEncode(this.moist),
          fire: U.rleEncode(this.fire), rad: U.rleEncode(this.rad), poll: U.rleEncode(this.poll), owner: U.rleEncode(this.owner),
        },
        buildings, entities, civs, deadCivs: this.deadCivs.slice(-50),
        weather: this.weather, log: this.log.slice(-150), labels: this.labels, flags: this.flags,
        stats: this.stats, playerStats: this.playerStats, nextId: this.nextId, globalMods: this.globalMods,
      };
    }
    static deserialize(d) {
      const w = new World({ id: d.id, name: d.name, seed: d.seed, w: d.w, h: d.h, ...(d.params || {}) });
      w.created = d.created || Date.now();
      w.tick = d.tick || 0;
      w.seaLevel = d.seaLevel || 128;
      const L = d.layers;
      w.tiles = U.rleDecode(L.tiles, w.n, Uint8Array);
      w.height = U.rleDecode(L.height, w.n, Uint8Array);
      w.moist = U.rleDecode(L.moist, w.n, Uint8Array);
      w.fire = U.rleDecode(L.fire, w.n, Uint8Array);
      w.rad = U.rleDecode(L.rad, w.n, Uint8Array);
      w.poll = U.rleDecode(L.poll, w.n, Uint8Array);
      w.owner = U.rleDecode(L.owner, w.n, Int16Array);
      for (let i = 0; i < w.n; i++) {
        if (w.fire[i]) w.burning.add(i);
        if (w.tiles[i] === T.LAVA || w.tiles[i] === T.MAGMA) w.lavaSet.add(i);
      }
      w.civs = (d.civs || []).map((c) => MB.Civs.deserialize(c));
      for (let i = 0; i < w.n; i++) { const o = w.owner[i]; if (o >= 0) { if (w.civs[o]) w.civs[o].tiles.add(i); else w.owner[i] = -1; } }
      for (const b of d.buildings || []) {
        const [i, t, civ, hp, prog, lvl] = b;
        if (!MB.Civs.BUILDINGS[t]) continue;
        const bd = MB.Civs.BUILDINGS[t];
        const bo = { i, x: i % w.w, y: (i / w.w) | 0, t, civ, hp, maxHp: bd.hp, prog, lvl };
        w.buildings.set(i, bo);
        if (w.civs[civ]) w.civs[civ].buildings.add(i);
      }
      for (const e of d.entities || []) { const ent = MB.Entities.deserialize(e); if (ent) { ent.id = w.nextId++; w.entities.push(ent); } }
      w.deadCivs = d.deadCivs || [];
      w.weather = Object.assign(w.weather, d.weather || {});
      w.log = d.log || [];
      w.labels = d.labels || [];
      w.flags = d.flags || {};
      w.stats = d.stats || w.stats;
      w.playerStats = Object.assign(w.playerStats, d.playerStats || {});
      w.globalMods = Object.assign(w.globalMods, d.globalMods || {});
      w.nextId = Math.max(w.nextId, d.nextId || 1);
      w.markAllDirty();
      return w;
    }
  }

  World.TPS = TPS; World.DAY_TICKS = DAY_TICKS; World.DAYS_PER_SEASON = DAYS_PER_SEASON; World.SEASONS = SEASONS; World.CH = CH; World.SIZES = SIZES; World.SAVE_VERSION = SAVE_VERSION;
  MB.World = World;
})();
