'use strict';
// MineBomb - renderer: chunked pixel terrain cache, buildings, entities, particles, overlays, minimap
(function () {
  const U = MB.util, T = MB.T, TILES = MB.TILES;
  const CH = 32, TILE = 8, CHPX = CH * TILE;
  const SPR = MB.SPR, PAL = MB.PAL;

  // ---- building sprites ----
  const BPAL = { W: '#f0ebe0', G: '#9a9a9a', g: '#5a5a5a', T: '#8b5a2b', t: '#5a3a1a', Y: '#ffd93d', R: '#c1121f', K: '#222222', A: '#d9b26a', B: '#3a86ff', L: '#a0e9ff', N: '#4caf50', n: '#2e6b2e', S: '#e2d08a', O: '#ff8c00', Z: '#2fd0ff' };
  const BS = {};
  const bs = (k, rows) => { BS[k] = rows; };
  bs('hut', ['...AA...', '..AAAA..', '.AAAAAA.', '.tttttt.', '.ttKKtt.', '.ttKKtt.']);
  bs('straw', ['..AAAA..', '.AAAAAA.', 'AAAAAAAA', '.TTTTTT.', '.TYTKTT.', '.TTTKTT.']);
  bs('house', ['..CCCC..', '.CCCCCC.', 'CCCCCCCC', '.TTTTTT.', '.TYTTYT.', '.TTTKKT.', '.TTTKKT.']);
  bs('stonehouse', ['..CCCC..', '.CCCCCC.', 'CCCCCCCC', '.GGGGGG.', '.GYGGYG.', '.GGGKKG.', '.GGGKKG.']);
  bs('townhouse', ['.CCCCCC.', 'CCCCCCCC', '.WWWWWW.', '.WYWWYW.', '.WWWWWW.', '.WYWWYW.', '.WWWWWW.', '.WWWKKW.', '.WWWKKW.']);
  bs('apartment', ['.CCCCCC.', '.GYGYGY.', '.GGGGGG.', '.GYGYGY.', '.GGGGGG.', '.GYGYGY.', '.GGGGGG.', '.GYGYGY.', '.GGGGGG.', '.GGGKKG.']);
  bs('towerblock', ['.CCCCCC.', '.gYgYgY.', '.gggggg.', '.gYgYgY.', '.gggggg.', '.gYgYgY.', '.gggggg.', '.gYgYgY.', '.gggggg.', '.gYgYgY.', '.gggggg.', '.gggKKg.']);
  bs('skyscraper', ['...CC...', '..LLLL..', '..LgLg..', '..LLLL..', '..LgLg..', '..LLLL..', '..LgLg..', '..LLLL..', '..LgLg..', '..LLLL..', '..LgLg..', '..LLLL..', '..LgLg..', '..LLLL..', '.LLLLLL.', '.LLLKKL.']);
  bs('arcology', ['...ZZ...', '..ZZZZ..', '.ZZNNZZ.', 'ZZNNNNZZ', 'ZNNNNNNZ', 'ZNNNNNNZ', 'ZZNNNNZZ', '.GGGGGG.', '.GYGYGY.', '.GGGGGG.', '.GYGYGY.', '.GGGGGG.', '.GYGYGY.', '.GGGKKG.']);
  bs('barn', ['..RRRR..', '.RRRRRR.', 'RRRRRRRR', '.RRRRRR.', '.RWWWWR.', '.RWKKWR.', '.RWKKWR.']);
  bs('camp', ['...T....', '..TTT...', '.TTTTT..', 'TTKTTT..', '......tt', '.....ttt']);
  bs('quarry', ['........', '.tt..tt.', '.tttttt.', '.tKKKKt.', '.tKKKKt.', 'gggggggg']);
  bs('mine', ['.tttttt.', '.tKKKKt.', '.tKKKKt.', '.tKKKKt.', 'gggggggg', '.T....T.']);
  bs('workshop', ['....gg..', '.GGGGGG.', 'GGGGGGGG', '.TTTTTT.', '.TYTTKT.', '.TTTTKT.']);
  bs('factory', ['.gg..gg.', '.gg..gg.', '.gg..gg.', 'gggggggg', 'gRRgRRgg', 'gggggggg', 'gYYgYYgg', 'gggggggg']);
  bs('factory_s', ['.tt..tt.', '.tt..tt.', 'TTTTTTTT', 'TRRTRRTT', 'TTTTTTTT', 'TYYTYYTT', 'TTTTTTTT']);
  bs('plant', ['..gggg..', '..g..g..', '..g..g..', '.g....g.', '.g....g.', 'gggggggg', 'gRRRRRRg', 'gggggggg']);
  bs('rig', ['...K....', '..KKK...', '..K.K...', '.K...K..', '.K...K..', 'KKKKKKK.', '.gggggg.']);
  bs('solar', ['........', 'BLBLBLBL', 'LBLBLBLB', 'BLBLBLBL', 'LBLBLBLB', '..gg.gg.']);
  bs('nuclear', ['..gggg..', '.g....g.', '.g....g.', '.g....g.', 'gggggggg', 'gYYKKYYg', 'gggggggg', 'gggggggg']);
  bs('shrine', ['........', '..RRRR..', '.R....R.', '..YYYY..', '..Y..Y..', '..Y..Y..', '.GGGGGG.']);
  bs('temple', ['..YYYY..', '.YYYYYY.', 'WWWWWWWW', '.W.WW.W.', '.W.WW.W.', '.W.WW.W.', 'WWWWWWWW']);
  bs('cathedral', ['...Y....', '...W....', '..WWW...', '..WWW...', '..WWW...', '.WWWWW..', '.WWWWWWW', '.WBWWBWW', '.WWWWWWW', '.WBWWBWW', '.WWWWWWW', '.WWWKKWW']);
  bs('market', ['........', 'RWRWRWRW', 'RWRWRWRW', '.T....T.', '.TYYOOT.', '.TTTTTT.']);
  bs('library', ['..WWWW..', '.WWWWWW.', 'WWWWWWWW', '.W.WW.W.', '.W.WW.W.', '.WBWWBW.', 'WWWWWWWW']);
  bs('school', ['.RRRRRR.', 'RRRRRRRR', '.WWWWWW.', '.WBWWBW.', '.WWWWWW.', '.WWWKKW.']);
  bs('university', ['...WW...', '..WWWW..', '.WWWWWW.', 'WWWWWWWW', '.W.WW.W.', '.W.WW.W.', '.WBWWBW.', 'WWWWWWWW']);
  bs('lab', ['..ZZZZ..', '.ZZZZZZ.', '.GGGGGG.', '.GZGGZG.', '.GGGGGG.', '.GGGKKG.']);
  bs('theater', ['.RRRRRR.', 'RRRRRRRR', '.YYYYYY.', '.YRYYRY.', '.YYYYYY.', '.YYYKKY.']);
  bs('plaza', ['........', '...LL...', '..LBBL..', '.LBBBBL.', '..GGGG..']);
  bs('statue', ['...G....', '..GGG...', '...G....', '..GGG...', '...G....', '.GGGGG..']);
  bs('monument', ['...GG...', '...GG...', '...GG...', '...GG...', '...GG...', '..GGGG..', '.GGGGGG.']);
  bs('hospital', ['.WWWWWW.', '.WWRRWW.', '.WRRRRW.', '.WWRRWW.', '.WWWWWW.', '.WWWKKW.']);
  bs('stadium', ['.GGGGGG.', 'GGNNNNGG', 'GNNNNNNG', 'GNNNNNNG', 'GGNNNNGG', '.GGGGGG.']);
  bs('well', ['........', '..TTTT..', '..T..T..', '..GGGG..', '..GBBG..', '..GGGG..']);
  bs('park', ['.NN..NN.', 'NNNNNNNN', '.NN..NN.', '..T..T..', '........']);
  bs('airport', ['....gg..', '....gg..', '.GGGGGG.', '.GZZZZG.', '.GGGGGG.', 'gggggggg']);
  bs('barracks', ['.C......', '.CC.....', '.C......', '.tttttt.', '.tRtRtt.', '.ttKKtt.']);
  bs('wall', ['G.G.G.G.', 'GGGGGGGG', 'GgGGgGGg', 'GGGGGGGG', 'GGgGGgGG', 'GGGGGGGG']);
  bs('tower', ['G.GG.G..', 'GGGGGG..', '.GGGG...', '.GgGG...', '.GGGG...', '.GGgG...', '.GGGG...', '.GGGG...', '.GKKG...', 'GGGGGG..']);
  bs('castle', ['C.......', 'CC......', 'C.......', 'G.G..G.G', 'GGGGGGGG', 'GGGgGGGG', 'GGGGGGGG', 'GgGGGGgG', 'GGGGGGGG', 'GGGKKGGG', 'GGGKKGGG']);
  bs('fort', ['........', '.gggggg.', 'gggggggg', 'ggKKKKgg', 'gggggggg']);
  bs('bunker', ['........', '.gggggg.', 'gggggggg', 'ggKKKKgg', 'gggggggg', 'gggggggg']);
  bs('silo', ['...RR...', '..gggg..', '.gggggg.', '.ggRRgg.', '.gggggg.', 'gggggggg']);
  bs('port', ['....C...', '....CC..', '....CCC.', '..TTTTT.', '.TTTTTTT', 'TTTTTTTT']);
  bs('dock', ['........', '....C...', '....CC..', '..TTTTT.', 'TTTTTTTT']);
  bs('pyramid', ['...SS...', '..SSSS..', '.SSSSSS.', 'SSSSSSSS', 'SSSSSSSS']);
  bs('lighthouse', ['...YY...', '..WWWW..', '..RRRR..', '..WWWW..', '..RRRR..', '..WWWW..', '..RRRR..', '.WWWWWW.', 'GGGGGGGG']);
  bs('observatory', ['..gggg..', '.gggggg.', '.gg.ggg.', '.WWWWWW.', '.WWWWWW.', '.WWWKKW.']);
  bs('dome', ['...ZZ...', '..ZZZZ..', '.ZZZZZZ.', 'ZZZZZZZZ', 'ZZZZZZZZ', 'ZLZZZZLZ', 'GGGGGGGG', 'GGGKKGGG']);
  bs('elevator', ['...ZZ...', '...ZZ...', '...gg...', '...gg...', '...gg...', '...gg...', '...gg...', '...gg...', '...gg...', '...gg...', '...gg...', '...gg...', '..gggg..', '.gggggg.', 'gggggggg']);
  bs('worldtree', ['..NNNN..', '.NNNNNN.', 'NNNNNNNN', 'NNNNNNNN', '.NNNNNN.', '..NTTN..', '...TT...', '...TT...', '...TT...', '...TT...', '..TTTT..', '.TTTTTT.']);
  bs('glass', ['..LLLL..', '.LLLLLL.', 'LNLNLNLL', 'LLLLLLLL', 'LNLNLNLL', 'LLLLKKLL']);
  bs('farm', ['........', '........', '........', '........', '........', '........', '.T....T.', '.TTTTTT.']);

  const LIGHT_PATTERNS = new Set(['house', 'stonehouse', 'townhouse', 'apartment', 'towerblock', 'skyscraper', 'arcology', 'factory', 'plant', 'lab', 'airport', 'stadium', 'hospital', 'nuclear', 'theater', 'market', 'university', 'school', 'library', 'cathedral', 'dome', 'elevator', 'lighthouse', 'silo', 'castle', 'tower', 'barracks', 'hut', 'straw']);

  // ---- color cache (uint32 ABGR) ----
  const colorCache = new Map();
  function c32(hex) {
    let v = colorCache.get(hex);
    if (v !== undefined) return v;
    const [r, g, b] = U.hexToRgb(hex);
    v = (255 << 24) | (b << 16) | (g << 8) | r;
    colorCache.set(hex, v);
    return v;
  }
  function mixHex(a, b, t) { return U.mix(a, b, t); }

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.cam = { x: 0, y: 0, zoom: 2 };
      this.chunks = new Map();
      this.show = { grid: false, borders: true, names: true, territory: true, overlay: 'none', weather: true, particles: true };
      this.seasonCache = -1;
      this.mm = null;
      this.hover = null;
      this.brush = { x: 0, y: 0, r: 3, color: '#fff', visible: false };
      this.selected = null;
      this.follow = null;
      this.resize();
      this.overlayCanvas = document.createElement('canvas');
      this.overlayCtx = this.overlayCanvas.getContext('2d');
      this.lightsByChunk = new Map();
      this.frame = 0;
    }
    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
      this.ctx.imageSmoothingEnabled = false;
    }
    worldToScreen(wx, wy) { return [(wx * TILE - this.cam.x) * this.cam.zoom, (wy * TILE - this.cam.y) * this.cam.zoom]; }
    screenToWorld(sx, sy) { return [(sx / this.cam.zoom + this.cam.x) / TILE, (sy / this.cam.zoom + this.cam.y) / TILE]; }
    centerOn(wx, wy) { this.cam.x = wx * TILE - this.canvas.width / 2 / this.cam.zoom; this.cam.y = wy * TILE - this.canvas.height / 2 / this.cam.zoom; }
    clampCamera(world) {
      if (!isFinite(this.cam.x) || !isFinite(this.cam.y) || !isFinite(this.cam.zoom)) { this.cam.zoom = 2; this.centerOn(world.w / 2, world.h / 2); }
      const vw = this.canvas.width / this.cam.zoom, vh = this.canvas.height / this.cam.zoom;
      const ww = world.w * TILE, wh = world.h * TILE;
      const margin = 80;
      this.cam.x = U.clamp(this.cam.x, -margin - Math.max(0, vw - ww) / 2, ww - vw + margin + Math.max(0, vw - ww) / 2);
      this.cam.y = U.clamp(this.cam.y, -margin - Math.max(0, vh - wh) / 2, wh - vh + margin + Math.max(0, vh - wh) / 2);
    }
    zoomAt(sx, sy, factor) {
      const [wx, wy] = this.screenToWorld(sx, sy);
      this.cam.zoom = U.clamp(this.cam.zoom * factor, 0.35, 8);
      // snap to nice levels
      const levels = [0.35, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8];
      let best = levels[0];
      for (const l of levels) if (Math.abs(l - this.cam.zoom) < Math.abs(best - this.cam.zoom)) best = l;
      this.cam.zoom = best;
      const [nx, ny] = this.screenToWorld(sx, sy);
      this.cam.x += (nx - wx) * TILE; this.cam.y += (ny - wy) * TILE;
    }
    invalidateAll() { for (const c of this.chunks.values()) c.dirty = true; }
    resetWorld() { this.chunks.clear(); this.lightsByChunk.clear(); this.mm = null; }

    // ---------- chunk rendering ----------
    getChunk(world, cx, cy) {
      const id = cy * world.cw + cx;
      let c = this.chunks.get(id);
      if (!c) {
        const cv = document.createElement('canvas'); cv.width = CHPX; cv.height = CHPX;
        const ctx = cv.getContext('2d');
        c = { cv, ctx, img: ctx.createImageData(CHPX, CHPX), dirty: true, id };
        c.d32 = new Uint32Array(c.img.data.buffer);
        this.chunks.set(id, c);
      }
      return c;
    }
    drawChunk(world, c, cx, cy) {
      const d32 = c.d32;
      const season = world.seasonIndex();
      const x0 = cx * CH, y0 = cy * CH;
      const lights = [];
      // tiles
      for (let ty = 0; ty < CH; ty++) {
        const wy = y0 + ty; if (wy >= world.h) break;
        for (let tx = 0; tx < CH; tx++) {
          const wx = x0 + tx; if (wx >= world.w) break;
          this.drawTile(world, d32, wx, wy, tx * TILE, ty * TILE, season);
        }
      }
      // borders & territory
      if (this.show.borders || this.show.territory) {
        for (let ty = 0; ty < CH; ty++) {
          const wy = y0 + ty; if (wy >= world.h) break;
          for (let tx = 0; tx < CH; tx++) {
            const wx = x0 + tx; if (wx >= world.w) break;
            const i = wy * world.w + wx;
            const o = world.owner[i];
            if (o < 0) continue;
            const civ = world.civs[o]; if (!civ) continue;
            const px = tx * TILE, py = ty * TILE;
            if (this.show.territory) { // subtle tint: dither pattern of civ color
              const cc = c32(civ.color);
              for (const [xx, yy] of [[2, 2], [6, 6]]) { const p = (py + yy) * CHPX + px + xx; d32[p] = blend32(d32[p], cc, 0.45); }
            }
            if (this.show.borders) {
              const cc = c32(civ.color);
              const left = wx === 0 || world.owner[i - 1] !== o, right = wx === world.w - 1 || world.owner[i + 1] !== o;
              const up = wy === 0 || world.owner[i - world.w] !== o, down = wy === world.h - 1 || world.owner[i + world.w] !== o;
              if (left) for (let yy = 0; yy < TILE; yy++) d32[(py + yy) * CHPX + px] = cc;
              if (right) for (let yy = 0; yy < TILE; yy++) d32[(py + yy) * CHPX + px + TILE - 1] = cc;
              if (up) for (let xx = 0; xx < TILE; xx++) d32[py * CHPX + px + xx] = cc;
              if (down) for (let xx = 0; xx < TILE; xx++) d32[(py + TILE - 1) * CHPX + px + xx] = cc;
            }
          }
        }
      }
      // buildings (draw after tiles so tall ones overlap tiles above)
      for (let ty = 0; ty < CH; ty++) {
        const wy = y0 + ty; if (wy >= world.h) break;
        for (let tx = 0; tx < CH; tx++) {
          const wx = x0 + tx; if (wx >= world.w) break;
          const b = world.buildings.get(wy * world.w + wx);
          if (!b) continue;
          const civ = world.civs[b.civ];
          this.drawBuilding(d32, b, tx * TILE, ty * TILE, civ ? civ.color : '#888', civ ? civ.color2 : '#444');
          const bd = MB.Civs.BUILDINGS[b.t];
          if (bd && LIGHT_PATTERNS.has(bd.pattern) && b.prog >= 1) lights.push([wx + 0.5, wy + 0.3, bd.pattern === 'skyscraper' || bd.pattern === 'arcology' || bd.pattern === 'towerblock' ? 2 : 1]);
        }
      }
      // grid
      if (this.show.grid) {
        const gc = c32('#000000');
        for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) { const p = (ty * TILE) * CHPX + tx * TILE; d32[p] = blend32(d32[p], gc, 0.35); }
      }
      c.ctx.putImageData(c.img, 0, 0);
      c.dirty = false;
      this.lightsByChunk.set(c.id, lights);
    }

    drawTile(world, d32, wx, wy, px, py, season) {
      const i = wy * world.w + wx;
      const t = world.tiles[i];
      const td = TILES[t];
      let [base, light, dark] = td.cols;
      const h = U.hash2(wx, wy, 1337);
      const h2 = U.hash2(wx, wy, 42);
      // seasonal tint
      if (season === 3 && (t === T.GRASS || t === T.FLOWERS || t === T.SAVANNA || t === T.FARM || t === T.SWAMP || t === T.MUD)) { base = mixHex(base, '#dfe9f0', 0.45); light = mixHex(light, '#ffffff', 0.5); dark = mixHex(dark, '#c0d0dd', 0.4); }
      else if (season === 3 && (t === T.FOREST || t === T.JUNGLE)) { base = mixHex(base, '#b0c8d0', 0.25); light = mixHex(light, '#ffffff', 0.4); }
      else if (season === 2 && (t === T.FOREST)) { base = mixHex(base, '#d9741a', 0.35); light = mixHex(light, '#ffb347', 0.4); dark = mixHex(dark, '#8b3a0a', 0.3); }
      else if (season === 2 && (t === T.GRASS || t === T.SAVANNA)) { base = mixHex(base, '#c9b458', 0.2); }
      else if (season === 0 && t === T.GRASS) { light = mixHex(light, '#ff9ecf', 0.15); }
      // moisture dryness
      if ((t === T.GRASS || t === T.SAVANNA) && world.moist[i] < 40) { base = mixHex(base, '#b9b35a', 0.3); }
      // radiation tint
      if (world.rad[i] > 60) { base = mixHex(base, '#9fff5f', Math.min(0.5, world.rad[i] / 400)); }
      if (world.poll[i] > 80) { base = mixHex(base, '#555', Math.min(0.4, world.poll[i] / 500)); }
      const B32 = c32(base), L32 = c32(light), D32 = c32(dark);
      const row0 = py * CHPX + px;
      for (let yy = 0; yy < TILE; yy++) { const r = row0 + yy * CHPX; for (let xx = 0; xx < TILE; xx++) d32[r + xx] = B32; }
      const put = (x, y, c) => { if (x >= 0 && x < TILE && y >= 0 && y < TILE) d32[row0 + y * CHPX + x] = c; };
      const pat = td.pattern;
      const n1 = (h * 8) | 0, n2 = (h2 * 8) | 0, n3 = ((h * 61) | 0) % 8, n4 = ((h2 * 37) | 0) % 8;
      switch (pat) {
        case 'noise': put(n1, n2, L32); put(n3, n4, D32); put((n1 + 3) % 8, (n2 + 5) % 8, D32); break;
        case 'waves': {
          // shading by depth
          const hv = world.height[i];
          if (t !== T.DEEP && hv < 100 && h > 0.5) { /* darker variance */ }
          put(n1, n2, L32); put((n1 + 1) % 8, n2, L32); put(n3, n4, D32); put((n3 + 1) % 8, n4, D32);
          if (h2 > 0.7) { put((n1 + 4) % 8, (n2 + 3) % 8, L32); put((n1 + 5) % 8, (n2 + 3) % 8, L32); }
          // coast foam
          if (t === T.SHALLOW || t === T.REEF) { let landN = false; world.neighbors4(i, (j) => { if (TILES[world.tiles[j]].land) landN = true; }); if (landN && h > 0.3) { put(n2, n1, c32('#cfe9ff')); put((n2 + 3) % 8, (n1 + 2) % 8, c32('#cfe9ff')); } }
          if (t === T.REEF) { put(n4, n3, c32('#ff8f6f')); put((n4 + 2) % 8, (n3 + 1) % 8, c32('#ffd27f')); put((n4 + 5) % 8, (n3 + 4) % 8, c32('#ff6fa0')); }
          break;
        }
        case 'dots': put(n1, n2, L32); put(n3, n4, L32); put((n1 + 4) % 8, (n2 + 2) % 8, D32); break;
        case 'grass': put(n1, n2, D32); put(n1, (n2 + 1) % 8, D32); put(n3, n4, L32); put((n3 + 4) % 8, (n4 + 3) % 8, D32); put((n1 + 5) % 8, (n2 + 6) % 8, L32); break;
        case 'trees': {
          const trunk = c32('#4a2f14');
          const drawTree = (cx, cy, size) => { for (let yy = -size; yy <= size; yy++) for (let xx = -size; xx <= size; xx++) { if (Math.abs(xx) + Math.abs(yy) <= size + (size > 1 ? 1 : 0)) put(cx + xx, cy + yy, (xx + yy < 0) ? L32 : D32); } put(cx, cy + size + 1, trunk); };
          drawTree(1 + (n1 % 3), 1 + (n2 % 3), 1);
          drawTree(4 + (n3 % 3), 4 + (n4 % 2), 1);
          if (h > 0.5) drawTree(5 + (n4 % 2), 1 + (n1 % 2), 1);
          if (t === T.JUNGLE) put(n1, 7, c32('#9fff5f'));
          break;
        }
        case 'hills': for (let k = 0; k < 4; k++) { put((n1 + k) % 8, (n2 + 2 - k) % 8, L32); } put(n3, n4, D32); put((n3 + 1) % 8, (n4 + 1) % 8, D32); put((n3 + 2) % 8, (n4 + 2) % 8, D32); break;
        case 'mountain': {
          const peak = c32('#ffffff'), snowy = world.tempAt(wx, wy) < 0.4 || world.height[i] > 245;
          for (let yy = 0; yy < TILE; yy++) for (let xx = 0; xx < TILE; xx++) { const dx = xx - 3.5; const ridge = Math.abs(dx) < (yy + 1) * 0.6; if (!ridge) continue; put(xx, yy, dx < 0 ? D32 : L32); }
          if (snowy) { put(3, 0, peak); put(4, 0, peak); put(4, 1, peak); }
          else put(3, 0, L32);
          break;
        }
        case 'dunes': for (let k = 0; k < 4; k++) put((n1 + k) % 8, (n2 + (k === 1 || k === 2 ? 1 : 0)) % 8, L32); for (let k = 0; k < 3; k++) put((n3 + k) % 8, n4, D32); break;
        case 'swamp': { const w32 = c32('#2f5f7f'); put(n1, n2, w32); put((n1 + 1) % 8, n2, w32); put(n3, n4, L32); put((n3 + 3) % 8, (n4 + 2) % 8, D32); put((n1 + 4) % 8, (n2 + 4) % 8, w32); break; }
        case 'lava': { const y32 = c32('#ffe066'), k32 = c32('#3a1a10'); put(n1, n2, y32); put((n1 + 1) % 8, n2, y32); put(n3, n4, k32); put((n3 + 1) % 8, (n4 + 1) % 8, k32); put((n1 + 4) % 8, (n2 + 3) % 8, y32); put((n3 + 5) % 8, (n4 + 6) % 8, k32); break; }
        case 'ice': for (let k = 0; k < 5; k++) put((n1 + k) % 8, (n2 + k) % 8, L32); put(n3, n4, D32); put((n3 + 1) % 8, (n4 + 2) % 8, D32); break;
        case 'rows': { const g32 = c32(season === 3 ? '#9a8a6a' : season === 1 ? '#6bbd47' : '#8aa83a'); for (let yy = 1; yy < TILE; yy += 3) for (let xx = 0; xx < TILE; xx++) put(xx, yy, D32); for (let yy = 0; yy < TILE; yy += 3) for (let xx = (n1 % 2); xx < TILE; xx += 2) put(xx, yy, g32); break; }
        case 'road': for (let xx = 0; xx < TILE; xx++) { put(xx, 0, D32); put(xx, 7, D32); } put(n1, 3 + (n2 % 2), L32); put(n3, 3 + (n4 % 2), D32); break;
        case 'ruins': { const k32 = c32('#3a3630'); put(n1, n2, k32); put((n1 + 1) % 8, n2, k32); put(n1, (n2 + 1) % 8, k32); put(n3, n4, L32); put((n3 + 2) % 8, (n4 + 3) % 8, L32); put((n1 + 4) % 8, (n2 + 4) % 8, k32); put((n1 + 5) % 8, (n2 + 4) % 8, k32); break; }
        case 'crack': { for (let k = 0; k < 5; k++) put((n1 + k) % 8, (n2 + ((k * 7) % 3)) % 8, D32); for (let k = 0; k < 3; k++) put((n3 + ((k * 5) % 3)) % 8, (n4 + k) % 8, D32); put((n1 + 6) % 8, (n2 + 6) % 8, L32); break; }
        case 'corrupt': { const v32 = c32('#c77dff'), k32 = c32('#1a0526'); for (let k = 0; k < 4; k++) put((n1 + k) % 8, (n2 + (k % 2)) % 8, v32); put(n3, n4, k32); put((n3 + 1) % 8, (n4 + 1) % 8, k32); put((n3 + 5) % 8, (n4 + 3) % 8, k32); break; }
        case 'holy': { const w32 = c32('#ffffff'); put(n1, n2, w32); put(n3, n4, w32); put((n1 + 4) % 8, (n2 + 4) % 8, L32); put((n3 + 2) % 8, (n4 + 5) % 8, D32); break; }
        case 'candy': { const w32 = c32('#ffffff'), r32 = c32('#ff3b6b'); for (let yy = 0; yy < TILE; yy++) put((yy + n1) % 8, yy, w32); put(n3, n4, r32); put((n3 + 4) % 8, (n4 + 3) % 8, r32); break; }
        case 'crater': { for (let yy = 0; yy < TILE; yy++) for (let xx = 0; xx < TILE; xx++) { const d = Math.hypot(xx - 3.5, yy - 3.5); if (d > 2.4 && d < 3.4) put(xx, yy, L32); else if (d < 1.6) put(xx, yy, D32); } break; }
        case 'pave': for (let xx = 0; xx < TILE; xx++) put(xx, 3, D32); for (let yy = 0; yy < TILE; yy++) put(yy < 4 ? 3 : 7, yy, D32); put(n1, n2, L32); break;
        case 'ore': { const o32 = c32(light); for (let k = 0; k < 4; k++) put((n1 + k) % 8, (n2 + 2 - k) % 8, c32('#a0a284')); put(n3, n4, o32); put((n3 + 1) % 8, n4, o32); put((n3 + 4) % 8, (n4 + 3) % 8, o32); put((n3 + 5) % 8, (n4 + 4) % 8, o32); put((n1 + 2) % 8, (n2 + 5) % 8, D32); break; }
        case 'crystal': { const w32 = c32('#ffffff'); put(n1, n2, w32); put(n1, (n2 + 1) % 8, L32); put((n1 + 1) % 8, (n2 + 1) % 8, L32); put(n1, (n2 + 2) % 8, D32); put(n3, n4, w32); put(n3, (n4 + 1) % 8, L32); put(n3, (n4 + 2) % 8, D32); break; }
        case 'shroom': { const cap = c32(light), stem = c32('#e8dcc8'), dot = c32('#ffffff'); const m = (cx, cy) => { put(cx - 1, cy, cap); put(cx, cy, cap); put(cx + 1, cy, cap); put(cx, cy - 1, cap); put(cx, cy + 1, stem); put(cx, cy + 2, stem); put(cx - 1, cy - 1, dot); }; m(2 + (n1 % 2), 2 + (n2 % 2)); m(5 + (n3 % 2), 4 + (n4 % 2)); break; }
        case 'flowers': { const cols = [c32('#ff6fa0'), c32('#ffe56f'), c32('#ff5f5f'), c32('#c77dff'), c32('#ffffff')]; put(n1, n2, cols[n3 % 5]); put(n3, n4, cols[(n1 + 1) % 5]); put((n1 + 4) % 8, (n2 + 3) % 8, cols[(n4 + 2) % 5]); put((n3 + 3) % 8, (n4 + 5) % 8, cols[(n2 + 3) % 5]); put((n1 + 2) % 8, (n2 + 6) % 8, D32); break; }
        case 'cave': { const k32 = c32('#15151a'); for (let k = 0; k < 4; k++) put((n1 + k) % 8, (n2 + 2 - k) % 8, L32); put(3, 3, k32); put(4, 3, k32); put(2, 4, k32); put(3, 4, k32); put(4, 4, k32); put(5, 4, k32); put(2, 5, k32); put(3, 5, k32); put(4, 5, k32); put(5, 5, k32); break; }
        case 'oil': { const s32 = c32('#555566'); put(n1, n2, s32); put((n1 + 1) % 8, n2, s32); put(n3, n4, c32('#000')); put((n3 + 3) % 8, (n4 + 2) % 8, c32('#2a2a3a')); break; }
        case 'geyser': { const b32 = c32('#3a86ff'), w32 = c32('#ffffff'); put(3, 3, b32); put(4, 3, b32); put(3, 4, b32); put(4, 4, b32); put(3, 2, w32); put(4, 5, D32); put(n1, n2, L32); break; }
        case 'reef': break;
        case 'bones': { const w32 = c32('#fffbe8'); put(n1, n2, w32); put((n1 + 1) % 8, n2, w32); put((n1 + 2) % 8, n2, w32); put(n3, n4, w32); put(n3, (n4 + 1) % 8, w32); put((n1 + 5) % 8, (n2 + 4) % 8, D32); break; }
        case 'rainbow': { const cols = [c32('#ff5f5f'), c32('#ffb347'), c32('#ffe56f'), c32('#5fff8f'), c32('#5fcfff'), c32('#5f8fff'), c32('#c77dff'), c32('#ff5fcf')]; for (let yy = 0; yy < TILE; yy++) for (let xx = 0; xx < TILE; xx++) put(xx, yy, cols[(xx + yy + wx + wy) % 8]); break; }
        case 'void': { const p32 = c32('#5a1e7a'); put(n1, n2, p32); put(n3, n4, c32('#ffffff')); put((n1 + 5) % 8, (n2 + 2) % 8, p32); break; }
        case 'cheese': { const hole = c32('#c9a227'); put(n1, n2, hole); put((n1 + 1) % 8, n2, hole); put(n1, (n2 + 1) % 8, hole); put(n3, n4, hole); put((n3 + 4) % 8, (n4 + 4) % 8, L32); break; }
        case 'graves': { const g32 = c32('#b0b0b0'), k32 = c32('#2a2a2a'); const stone = (x, y) => { put(x, y, g32); put(x + 1, y, g32); put(x, y + 1, g32); put(x + 1, y + 1, g32); put(x, y + 2, k32); put(x + 1, y + 2, k32); }; stone(1 + (n1 % 2), 1 + (n2 % 2)); stone(5, 3 + (n4 % 2)); put(n3, 7, D32); break; }
        case 'tech': { const z32 = c32('#2fd0ff'); for (let xx = 0; xx < TILE; xx++) put(xx, 3, z32); for (let yy = 0; yy < TILE; yy++) put(n1, yy, D32); put(n3, n4, z32); put((n3 + 2) % 8, (n4 + 5) % 8, c32('#ffffff')); break; }
        default: put(n1, n2, L32); put(n3, n4, D32); break;
      }
      // shoreline sand darkening next to water
      if (td.land && td.elev === 0 && !td.water && world.isCoastal(i) && (t === T.SAND || t === T.GRASS)) { for (let xx = 0; xx < TILE; xx += 2) put(xx, 7, D32); }
      // snow line on high hills
      if (t === T.HILLS && world.tempAt(wx, wy) < 0.3) { put(n1, 0, c32('#ffffff')); put((n1 + 2) % 8, 1, c32('#ffffff')); }
    }

    drawBuilding(d32, b, px, py, civCol, civDark) {
      const bd = MB.Civs.BUILDINGS[b.t];
      if (!bd) return;
      const rows = BS[bd.pattern] || BS.house;
      const H = rows.length;
      const under = b.prog < 1;
      const civ32 = c32(civCol), civd32 = c32(civDark);
      const dmg = b.hp / b.maxHp;
      for (let r = 0; r < H; r++) {
        const row = rows[r];
        const y = py + TILE - H + r;
        if (y < 0 || y >= CHPX) continue;
        for (let x = 0; x < row.length && x < TILE; x++) {
          const ch = row[x];
          if (ch === '.') continue;
          if (under && ((x + r) % 2 === 0)) continue;
          let col;
          if (ch === 'C') col = civ32; else if (ch === 'c') col = civd32; else { const hex = BPAL[ch]; if (!hex) continue; col = c32(hex); }
          if (dmg < 0.5 && ((x * 7 + r * 3) % 5 === 0)) col = c32('#2a2a2a');
          d32[y * CHPX + px + x] = col;
        }
      }
      if (under) { const s32 = c32('#c9a227'); for (let r = 0; r < H; r += 2) { const y = py + TILE - H + r; if (y >= 0 && y < CHPX) { d32[y * CHPX + px] = s32; d32[y * CHPX + px + 7] = s32; } } }
    }

    // ---------- main draw ----------
    draw(game, dt) {
      const world = game.world;
      const ctx = this.ctx, cam = this.cam, zoom = cam.zoom;
      const W = this.canvas.width, H = this.canvas.height;
      this.frame++;
      if (this.follow) { const e = this.follow; if (e.dead) this.follow = null; else this.centerOn(e.x, e.y); }
      this.clampCamera(world);
      // shake
      const st = MB.Particles.state;
      let shx = 0, shy = 0;
      if (st.shake > 0 && game.settings.shake !== false) { shx = (Math.random() - 0.5) * st.shake; shy = (Math.random() - 0.5) * st.shake; }
      if (world.shake > 0) { shx += (Math.random() - 0.5) * world.shake; shy += (Math.random() - 0.5) * world.shake; world.shake = Math.max(0, world.shake - 0.5); }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#05070d';
      ctx.fillRect(0, 0, W, H);
      ctx.translate(Math.round(shx), Math.round(shy));
      ctx.imageSmoothingEnabled = false;
      // season change invalidation
      const season = world.seasonIndex();
      if (season !== this.seasonCache) { this.seasonCache = season; this.invalidateAll(); }
      if (world.dirtyAll) { this.invalidateAll(); world.dirtyAll = false; world.dirty.clear(); }
      for (const id of world.dirty) { const c = this.chunks.get(id); if (c) c.dirty = true; }
      world.dirty.clear();
      // visible chunk range
      const vx0 = Math.max(0, Math.floor(cam.x / CHPX)), vy0 = Math.max(0, Math.floor(cam.y / CHPX));
      const vx1 = Math.min(world.cw - 1, Math.floor((cam.x + W / zoom) / CHPX)), vy1 = Math.min(world.chh - 1, Math.floor((cam.y + H / zoom) / CHPX));
      let redrawn = 0;
      const maxRedraw = this.frame < 5 ? 200 : 14;
      for (let cy = vy0; cy <= vy1; cy++) for (let cx = vx0; cx <= vx1; cx++) {
        const c = this.getChunk(world, cx, cy);
        if (c.dirty && redrawn < maxRedraw) { this.drawChunk(world, c, cx, cy); redrawn++; }
        const sx0 = Math.round((cx * CHPX - cam.x) * zoom), sy0 = Math.round((cy * CHPX - cam.y) * zoom);
        const sx1 = Math.round(((cx + 1) * CHPX - cam.x) * zoom), sy1 = Math.round(((cy + 1) * CHPX - cam.y) * zoom);
        ctx.drawImage(c.cv, sx0, sy0, sx1 - sx0, sy1 - sy0);
      }
      // visible tile bounds
      const tx0 = Math.max(0, Math.floor(cam.x / TILE)), ty0 = Math.max(0, Math.floor(cam.y / TILE));
      const tx1 = Math.min(world.w - 1, Math.ceil((cam.x + W / zoom) / TILE)), ty1 = Math.min(world.h - 1, Math.ceil((cam.y + H / zoom) / TILE));
      this.visible = { tx0, ty0, tx1, ty1 };
      // overlays (data layers)
      if (this.show.overlay !== 'none') this.drawDataOverlay(world, tx0, ty0, tx1, ty1);
      // fire & lava glow
      this.drawFire(world, tx0, ty0, tx1, ty1);
      // entities
      this.drawEntities(game, tx0, ty0, tx1, ty1);
      // particles
      if (this.show.particles !== false) this.drawParticles(ctx);
      // labels & names
      this.drawNames(world, tx0, ty0, tx1, ty1);
      // night & weather
      this.drawAtmosphere(game, tx0, ty0, tx1, ty1);
      // selection & brush
      this.drawBrush(game);
      // flash
      if (st.flash > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = Math.min(1, st.flash); ctx.fillStyle = st.flashColor; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    drawDataOverlay(world, tx0, ty0, tx1, ty1) {
      const w = tx1 - tx0 + 1, h = ty1 - ty0 + 1;
      if (w <= 0 || h <= 0) return;
      const oc = this.overlayCanvas;
      if (oc.width !== w || oc.height !== h) { oc.width = w; oc.height = h; }
      const img = this.overlayCtx.createImageData(w, h);
      const d = img.data;
      const mode = this.show.overlay;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (ty0 + y) * world.w + tx0 + x;
        const p = (y * w + x) * 4;
        let r = 0, g = 0, b = 0, a = 0;
        if (mode === 'radiation') { const v = world.rad[i]; if (v) { r = 120; g = 255; b = 60; a = Math.min(200, v * 1.5); } }
        else if (mode === 'pollution') { const v = world.poll[i]; if (v) { r = 60; g = 50; b = 40; a = Math.min(210, v * 1.6); } }
        else if (mode === 'moisture') { const v = world.moist[i]; if (!TILES[world.tiles[i]].water) { r = 255 - v; g = 120; b = v; a = 110; } }
        else if (mode === 'height') { const v = world.height[i]; r = v; g = v; b = v; a = 150; }
        else if (mode === 'fertility') { const td = TILES[world.tiles[i]]; const v = td.fert; r = 255 * (1 - v); g = 255 * v; b = 0; a = 110; }
        else if (mode === 'temperature') { const v = world.tempAt(tx0 + x, ty0 + y); r = 255 * v; g = 60; b = 255 * (1 - v); a = 120; }
        d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = a;
      }
      this.overlayCtx.putImageData(img, 0, 0);
      const [sx, sy] = this.worldToScreen(tx0, ty0);
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(oc, Math.round(sx), Math.round(sy), Math.round(w * TILE * this.cam.zoom), Math.round(h * TILE * this.cam.zoom));
    }

    drawFire(world, tx0, ty0, tx1, ty1) {
      const ctx = this.ctx, z = this.cam.zoom, s = TILE * z;
      const t = this.frame;
      if (world.burning.size) {
        for (const i of world.burning) {
          const x = i % world.w, y = (i / world.w) | 0;
          if (x < tx0 || x > tx1 || y < ty0 || y > ty1) continue;
          const [sx, sy] = this.worldToScreen(x, y);
          const f = world.fire[i] / 255;
          const hh = U.hash2(x, y, t >> 2);
          ctx.fillStyle = hh > 0.5 ? '#ff8c00' : '#ff3b00';
          ctx.globalAlpha = 0.55 + f * 0.3;
          ctx.fillRect(sx + s * 0.15, sy + s * (0.3 - hh * 0.2), s * 0.7, s * (0.7 + hh * 0.2));
          ctx.fillStyle = '#ffe066';
          ctx.fillRect(sx + s * 0.35, sy + s * (0.5 - hh * 0.1), s * 0.3, s * 0.4);
          ctx.globalAlpha = 1;
          if (z >= 1 && Math.random() < 0.08) MB.fx.smoke(x + 0.5, y + 0.2, 1);
          if (z >= 1 && Math.random() < 0.08) MB.fx.ember(x + Math.random(), y + Math.random());
        }
      }
      // factory smoke
      if (t % 10 === 0 && z >= 1) {
        for (const [, lights] of this.lightsByChunk) { /* no-op */ }
      }
    }

    drawEntities(game, tx0, ty0, tx1, ty1) {
      const world = game.world, ctx = this.ctx, z = this.cam.zoom;
      const ents = world.entities;
      const sel = this.selected;
      const minZ = z < 0.75;
      for (let k = 0; k < ents.length; k++) {
        const e = ents[k];
        if (e.dead) continue;
        if (e.x < tx0 - 3 || e.x > tx1 + 3 || e.y < ty0 - 3 || e.y > ty1 + 3) continue;
        const [sx, sy] = this.worldToScreen(e.x, e.y);
        if (minZ && e.kind !== 'special' && !e.def.boss) {
          ctx.fillStyle = e.kind === 'human' ? (e.civ >= 0 && world.civs[e.civ] ? world.civs[e.civ].color : '#fff') : e.kind === 'monster' ? '#c77dff' : e.kind === 'mythic' ? '#ffd700' : '#ddd';
          ctx.fillRect(sx - 1, sy - 1, 2, 2);
          continue;
        }
        this.drawEntity(world, e, sx, sy, z);
        if (sel && sel.id === e.id && sel === e) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(sx - 6 * z, sy - 9 * z, 12 * z, 11 * z); }
      }
    }

    drawEntity(world, e, sx, sy, z) {
      const ctx = this.ctx;
      const d = e.def;
      const type = e.type;
      // procedural specials
      if (type === 'tornado' || type === 'fire_tornado' || type === 'sharknado' || type === 'mega_tornado') return this.drawTornado(e, sx, sy, z);
      if (type === 'cloud') return this.drawCloud(e, sx, sy, z);
      if (type === 'meteor') { ctx.fillStyle = e.data.ice ? '#a0e9ff' : '#ff8c00'; const s = (4 + (e.power || 3)) * z * 0.6; ctx.fillRect(sx - s / 2, sy - s / 2, s, s); ctx.fillStyle = e.data.ice ? '#fff' : '#ffe066'; ctx.fillRect(sx - s / 4, sy - s / 4, s / 2, s / 2); return; }
      if (type === 'blackhole') { const r = (e.r || 1.5) * TILE * z; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#c77dff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, r * 1.15, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sx, sy, r * 1.5 + Math.sin(this.frame * 0.1) * 2, 0, Math.PI * 2); ctx.stroke(); return; }
      if (type === 'shield' || type === 'forcefield_gen') { const r = (e.r || d.r || 6) * TILE * z; ctx.strokeStyle = 'rgba(160,233,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = 'rgba(160,233,255,0.08)'; ctx.fill(); if (type === 'shield') return; }
      if (type === 'projectile') { const k = e.data.kind; ctx.fillStyle = k === 'laser' ? '#ff3b3b' : k === 'fireball' ? '#ff8c00' : k === 'cannon' ? '#222' : k === 'bullet' ? '#ffd93d' : '#ddd'; const s = Math.max(2, (k === 'cannon' ? 3 : 2) * z); ctx.fillRect(sx - s / 2, sy - s / 2, s, s); return; }
      if (type === 'totem' || type === 'statue' || type === 'monolith' || type === 'campfire' || type === 'lightning_rod' || type === 'terraformer' || type === 'weather_machine' || type === 'well' || type === 'scarecrow' || type === 'beacon' || type === 'sign' || type === 'landmine' || type === 'turret') {
        // static objects drawn via sprite below
      }
      const spr = SPR[d.sprite] || SPR.generic;
      const civ = e.civ >= 0 ? world.civs[e.civ] : null;
      const civCol = civ ? civ.color : (e.kind === 'human' ? '#a0522d' : '#999');
      const scale = e.scale * (e.kind === 'animal' && e.age < 400 && d.breed ? 0.6 : 1);
      const ps = Math.max(1, z * scale);
      const w = spr.w, h = spr.h;
      const ox = sx - (w * ps) / 2, oy = sy - h * ps + ps;
      const flash = e.flash > 0;
      const recolor = d.recolor;
      const hop = (e.kind === 'animal' || e.kind === 'human' || e.kind === 'monster') && e.hasTarget ? Math.abs(Math.sin((this.frame + e.id) * 0.3)) * ps : 0;
      if (e.frozen > 0) { ctx.fillStyle = 'rgba(160,233,255,0.6)'; ctx.fillRect(ox - ps, oy - ps, (w + 2) * ps, (h + 2) * ps); }
      for (let r = 0; r < h; r++) {
        const row = spr.rows[r];
        for (let c = 0; c < w; c++) {
          const ch = row[e.flip ? w - 1 - c : c];
          if (ch === '.') continue;
          let col;
          if (flash) col = '#ffffff';
          else if (ch === 'C') col = civCol;
          else if (recolor && recolor[ch]) col = recolor[ch];
          else col = PAL[ch] || '#f0f';
          ctx.fillStyle = col;
          ctx.fillRect(Math.round(ox + c * ps), Math.round(oy + r * ps - hop), Math.ceil(ps), Math.ceil(ps));
        }
      }
      if (d.ethereal) { ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(ox, oy, w * ps, h * ps); }
      // health bar for bosses & damaged notable entities
      if ((d.boss || e.kind === 'mythic' || type === 'hero' || type === 'leader') && e.hp < e.maxHp && z >= 1) {
        ctx.fillStyle = '#300'; ctx.fillRect(ox, oy - 4, w * ps, 2);
        ctx.fillStyle = d.boss ? '#f33' : '#3f3'; ctx.fillRect(ox, oy - 4, w * ps * (e.hp / e.maxHp), 2);
      }
      if (type === 'leader' && z >= 2) { ctx.fillStyle = '#ffd700'; ctx.fillRect(ox + ps, oy - 2 * ps, ps, ps); ctx.fillRect(ox + 3 * ps, oy - 2 * ps, ps, ps); }
      if (type === 'bomb' || type === 'landmine') { if (e.fuse !== undefined && e.fuse < 20 && (this.frame & 4)) { ctx.fillStyle = '#f00'; ctx.fillRect(ox, oy, w * ps, h * ps); } }
      if (type === 'sign' && e.name && z >= 1.5) { ctx.font = `${Math.max(9, 5 * z)}px monospace`; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(e.name, sx + 1, oy - 3 + 1); ctx.fillStyle = '#ffe9a8'; ctx.fillText(e.name, sx, oy - 3); }
      if (e.name && (type === 'hero' || type === 'paladin' || d.boss) && z >= 2) { ctx.font = `${Math.max(9, 4 * z)}px monospace`; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(e.name, sx + 1, oy - 5 + 1); ctx.fillStyle = d.boss ? '#ff6b6b' : '#ffd700'; ctx.fillText(e.name, sx, oy - 5); }
    }
    drawTornado(e, sx, sy, z) {
      const ctx = this.ctx, r = (e.r || e.def.r || 2.2) * TILE * z;
      const fire = e.def.fire;
      const layers = 7;
      for (let k = 0; k < layers; k++) {
        const t = k / layers;
        const rr = r * (0.25 + t * 0.9), yy = sy - t * r * 2.2;
        const wob = Math.sin(this.frame * 0.25 + k) * r * 0.15;
        ctx.fillStyle = fire ? (k % 2 ? 'rgba(255,100,0,0.45)' : 'rgba(80,40,20,0.5)') : (k % 2 ? 'rgba(170,170,180,0.45)' : 'rgba(110,110,120,0.5)');
        ctx.beginPath(); ctx.ellipse(sx + wob, yy, rr, rr * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      }
      if (e.def.sharks && (this.frame & 8)) { ctx.fillStyle = '#9a9a9a'; ctx.fillRect(sx + Math.sin(this.frame * 0.2) * r, sy - r * 1.5, 6 * z, 3 * z); }
    }
    drawCloud(e, sx, sy, z) {
      const ctx = this.ctx, r = (e.r || 6) * TILE * z;
      const type = e.cloudType || 'rain';
      const col = { storm: '#4a4f60', acid: '#6a7a40', blood: '#6a2030', lava: '#6a3020', ash: '#555', fallout: '#5a6a4a', void: '#2a1a3a', gold: '#8a7a40', candy: '#b07090', snow: '#e8eef5', heal: '#8fd3c8', confetti: '#b0a0d0', rainbow: '#d0d0ff', fertile: '#7fa07f', pollen: '#d0c070', freeze: '#bfe3f5', poison: '#6a4a8a' }[type] || '#9aa3b5';
      const puffs = 5;
      ctx.globalAlpha = 0.85;
      for (let k = 0; k < puffs; k++) {
        const a = (k / puffs) * Math.PI * 2 + this.frame * 0.005;
        const px = sx + Math.cos(a) * r * 0.45, py = sy - r * 0.9 + Math.sin(a * 2) * r * 0.12;
        ctx.fillStyle = k % 2 ? col : U.mix(col, '#ffffff', 0.25);
        ctx.beginPath(); ctx.ellipse(px, py, r * 0.42, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = U.mix(col, '#ffffff', 0.35);
      ctx.beginPath(); ctx.ellipse(sx, sy - r * 1.05, r * 0.5, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      if (type === 'storm' && Math.random() < 0.02) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(sx, sy - r * 0.9, r * 0.9, r * 0.5, 0, 0, Math.PI * 2); ctx.fill(); }
      // radius hint
      ctx.strokeStyle = 'rgba(140,180,255,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.stroke();
    }

    drawParticles(ctx) {
      const z = this.cam.zoom;
      const list = MB.Particles.list;
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        const [sx, sy] = this.worldToScreen(p.x, p.y);
        const lifeT = p.age / p.life;
        const alpha = p.fade ? 1 - lifeT : (p.twinkle ? (0.5 + 0.5 * Math.sin(p.age * 1.5)) : 1);
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        if (p.mush) { // mushroom cloud shaping
          if (p.y < p.mush.top) { p.vy *= 0.9; p.vx += (Math.random() - 0.5) * 0.01 + Math.sign(p.x - p.mush.ox) * 0.004; p.vx = U.clamp(p.vx, -0.05, 0.05); }
        }
        switch (p.type) {
          case 'rect': { const s = Math.max(1, (p.size + (p.grow ? p.grow * p.age : 0)) * TILE * z); ctx.fillStyle = p.color; ctx.fillRect(sx - s / 2, sy - s / 2, s, s); break; }
          case 'drop': { ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1, z * 0.6); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + 4 * z); ctx.stroke(); break; }
          case 'line': { const [x2, y2] = this.worldToScreen(p.x2, p.y2); ctx.strokeStyle = p.color; ctx.lineWidth = p.width || 1; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(x2, y2); ctx.stroke(); break; }
          case 'poly': { ctx.strokeStyle = p.glow || p.color; ctx.lineWidth = (p.width || 1) * 3; ctx.globalAlpha *= 0.3; ctx.beginPath(); for (let k = 0; k < p.pts.length; k++) { const [x, y] = this.worldToScreen(p.pts[k][0], p.pts[k][1]); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); ctx.globalAlpha = Math.max(0, 1 - lifeT); ctx.strokeStyle = p.color; ctx.lineWidth = p.width || 1; ctx.stroke(); break; }
          case 'ring': { ctx.strokeStyle = p.color; ctx.lineWidth = p.width || 2; ctx.beginPath(); ctx.arc(sx, sy, Math.max(0.1, p.r * TILE * z), 0, Math.PI * 2); ctx.stroke(); break; }
          case 'glow': { const r = Math.max(1, p.r * TILE * z); if (!isFinite(r) || !isFinite(sx) || !isFinite(sy)) break; const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r); g.addColorStop(0, p.color); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, r * 2, r * 2); break; }
          case 'text': { ctx.font = `${Math.max(10, 5 * z)}px monospace`; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(p.text, sx + 1, sy + 1); ctx.fillStyle = p.color; ctx.fillText(p.text, sx, sy); break; }
        }
      }
      ctx.globalAlpha = 1;
    }

    drawNames(world, tx0, ty0, tx1, ty1) {
      const ctx = this.ctx, z = this.cam.zoom;
      if (this.show.names && z >= 0.75) {
        ctx.textAlign = 'center';
        const fs = Math.max(10, Math.min(16, 5 * z + 4));
        ctx.font = `bold ${fs}px monospace`;
        for (const c of world.civs) {
          if (!c.alive) continue;
          if (c.cx < tx0 - 10 || c.cx > tx1 + 10 || c.cy < ty0 - 10 || c.cy > ty1 + 10) continue;
          const [sx, sy] = this.worldToScreen(c.cx + 0.5, c.cy - 0.6);
          const name = MB.Civs.fullName(c);
          const wars = Object.keys(c.wars).length;
          const label = `${MB.Civs.ERA_ICONS[c.era]} ${name}${wars ? ' ⚔' : ''}${c.plague ? ' ☣' : ''}`;
          ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(label, sx, sy);
          ctx.fillStyle = c.color; ctx.fillText(label, sx, sy);
          ctx.font = `${Math.max(9, fs - 3)}px monospace`;
          const sub = `pop ${U.fmt(c.pop)}`;
          ctx.strokeText(sub, sx, sy + fs); ctx.fillStyle = '#eee'; ctx.fillText(sub, sx, sy + fs);
          ctx.font = `bold ${fs}px monospace`;
        }
      }
      // labels
      if (z >= 1) for (const l of world.labels) {
        if (l.x < tx0 || l.x > tx1 || l.y < ty0 || l.y > ty1) continue;
        const [sx, sy] = this.worldToScreen(l.x + 0.5, l.y);
        ctx.font = `${Math.max(10, 4 * z + 2)}px monospace`; ctx.textAlign = 'center';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(l.text, sx, sy); ctx.fillStyle = '#ffe9a8'; ctx.fillText(l.text, sx, sy);
      }
    }

    drawAtmosphere(game, tx0, ty0, tx1, ty1) {
      const world = game.world, ctx = this.ctx, W = this.canvas.width, H = this.canvas.height, z = this.cam.zoom;
      const dl = world.daylight();
      const night = Math.max(0, 1 - dl * 1.6);
      // city lights before dark overlay
      if (night > 0.2 && z >= 0.75) {
        ctx.globalCompositeOperation = 'lighter';
        const vx0 = Math.max(0, Math.floor(tx0 / CH)), vy0 = Math.max(0, Math.floor(ty0 / CH)), vx1 = Math.min(world.cw - 1, Math.floor(tx1 / CH)), vy1 = Math.min(world.chh - 1, Math.floor(ty1 / CH));
        for (let cy = vy0; cy <= vy1; cy++) for (let cx = vx0; cx <= vx1; cx++) {
          const lights = this.lightsByChunk.get(cy * world.cw + cx);
          if (!lights) continue;
          for (const [lx, ly, s] of lights) {
            const [sx, sy] = this.worldToScreen(lx, ly);
            const r = (6 + s * 4) * z;
            const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
            g.addColorStop(0, `rgba(255,220,140,${0.35 * night})`); g.addColorStop(1, 'rgba(255,220,140,0)');
            ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
          }
        }
        // lava glow
        if (world.lavaSet.size) for (const i of world.lavaSet) { const x = i % world.w, y = (i / world.w) | 0; if (x < tx0 || x > tx1 || y < ty0 || y > ty1) continue; const [sx, sy] = this.worldToScreen(x + 0.5, y + 0.5); const r = 10 * z; const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r); g.addColorStop(0, `rgba(255,120,30,${0.45 * night})`); g.addColorStop(1, 'rgba(255,120,30,0)'); ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, r * 2, r * 2); }
        ctx.globalCompositeOperation = 'source-over';
      }
      if (night > 0.01) { ctx.fillStyle = `rgba(8,12,40,${(night * 0.5).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
      // dawn/dusk tint
      const h = world.hour();
      if ((h > 5 && h < 7.5) || (h > 17 && h < 19.5)) { const k = h < 12 ? 1 - Math.abs(h - 6.25) / 1.25 : 1 - Math.abs(h - 18.25) / 1.25; ctx.fillStyle = `rgba(255,120,50,${(Math.max(0, k) * 0.12).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
      // weather
      if (!this.show.weather) return;
      const wt = world.weather.type, inten = world.weather.intensity || 0.8;
      if (wt === 'rain' || wt === 'storm' || wt === 'acid' || wt === 'monsoon') {
        const n = Math.round((wt === 'storm' || wt === 'monsoon' ? 220 : 120) * inten * (W * H) / (1920 * 1080));
        ctx.strokeStyle = wt === 'acid' ? 'rgba(160,255,100,0.5)' : 'rgba(170,200,255,0.45)'; ctx.lineWidth = 1;
        ctx.beginPath();
        const wind = world.weather.windX * 6;
        for (let k = 0; k < n; k++) { const x = Math.random() * W, y = Math.random() * H; ctx.moveTo(x, y); ctx.lineTo(x + wind, y + 10 + Math.random() * 8); }
        ctx.stroke();
        ctx.fillStyle = `rgba(40,50,80,${wt === 'storm' ? 0.25 : 0.12})`; ctx.fillRect(0, 0, W, H);
      } else if (wt === 'snow') {
        const n = Math.round(150 * inten * (W * H) / (1920 * 1080));
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        const t = this.frame;
        for (let k = 0; k < n; k++) { const x = ((k * 97 + t * (0.5 + (k % 3) * 0.3) + Math.sin(t * 0.02 + k) * 20) % W + W) % W, y = ((k * 53 + t * (0.8 + (k % 4) * 0.3)) % H + H) % H; ctx.fillRect(x, y, 2, 2); }
        ctx.fillStyle = 'rgba(220,230,255,0.1)'; ctx.fillRect(0, 0, W, H);
      } else if (wt === 'fog') { ctx.fillStyle = 'rgba(200,205,215,0.35)'; ctx.fillRect(0, 0, W, H); }
      else if (wt === 'heat') { ctx.fillStyle = 'rgba(255,140,40,0.08)'; ctx.fillRect(0, 0, W, H); }
      else if (wt === 'cloudy') { ctx.fillStyle = 'rgba(80,90,110,0.12)'; ctx.fillRect(0, 0, W, H); }
      else if (wt === 'windy') { if (Math.random() < 0.3) MB.fx.leaf((Math.random() * (tx1 - tx0) + tx0), (Math.random() * (ty1 - ty0) + ty0)); }
      if (world.flags.aurora || (world.tempAt(0, 0) < 0.3 && night > 0.5 && Math.random() < 1)) { if (world.flags.aurora) { const g = ctx.createLinearGradient(0, 0, W, H * 0.4); const t = this.frame * 0.01; g.addColorStop(0, `rgba(60,255,160,${0.12 + 0.05 * Math.sin(t)})`); g.addColorStop(0.5, `rgba(120,80,255,${0.1 + 0.05 * Math.cos(t * 1.3)})`); g.addColorStop(1, 'rgba(60,255,200,0.08)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.5); } }
      const gp = world.globalPollution();
      if (gp > 0.3) { ctx.fillStyle = `rgba(90,80,60,${((gp - 0.3) * 0.35).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
      if (world.flags.disco) { ctx.fillStyle = U.rgba(U.hslToHex((this.frame * 7) % 360, 1, 0.5), 0.12); ctx.fillRect(0, 0, W, H); }
    }

    drawBrush(game) {
      const b = this.brush;
      if (!b.visible) return;
      const ctx = this.ctx, z = this.cam.zoom;
      const [sx, sy] = this.worldToScreen(b.x, b.y);
      const r = b.r * TILE * z;
      ctx.strokeStyle = b.color; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(sx, sy, Math.max(3, r), 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = U.rgba(b.color, 0.07); ctx.fill();
      // crosshair
      ctx.fillStyle = b.color; ctx.fillRect(sx - 1, sy - 5, 2, 10); ctx.fillRect(sx - 5, sy - 1, 10, 2);
    }

    // ---------- minimap ----------
    drawMinimap(world, mmCanvas, force) {
      if (!this.mm || this.mm.width !== world.w || this.mm.height !== world.h) { this.mm = document.createElement('canvas'); this.mm.width = world.w; this.mm.height = world.h; this.mmCtx = this.mm.getContext('2d'); this.mmImg = this.mmCtx.createImageData(world.w, world.h); this.mm32 = new Uint32Array(this.mmImg.data.buffer); world.minimapDirty = true; }
      if (world.minimapDirty || force || this.frame % 40 === 0) {
        const d32 = this.mm32;
        for (let i = 0; i < world.n; i++) {
          const td = TILES[world.tiles[i]];
          let c = c32(td.cols[0]);
          const o = world.owner[i];
          if (o >= 0 && world.civs[o]) c = blend32(c, c32(world.civs[o].color), 0.55);
          if (world.fire[i]) c = c32('#ff6a00');
          d32[i] = c;
        }
        for (const e of world.entities) { if (e.dead) continue; if (e.def.boss) d32[(e.y | 0) * world.w + (e.x | 0)] = c32('#ff00ff'); else if (e.type === 'cloud') d32[(e.y | 0) * world.w + (e.x | 0)] = c32('#ffffff'); }
        this.mmCtx.putImageData(this.mmImg, 0, 0);
        world.minimapDirty = false;
      }
      const ctx = mmCanvas.getContext('2d');
      const W = mmCanvas.width, H = mmCanvas.height;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const scale = Math.min(W / world.w, H / world.h);
      const dw = world.w * scale, dh = world.h * scale, ox = (W - dw) / 2, oy = (H - dh) / 2;
      ctx.drawImage(this.mm, ox, oy, dw, dh);
      // viewport
      const vx = this.cam.x / TILE, vy = this.cam.y / TILE, vw = this.canvas.width / this.cam.zoom / TILE, vh = this.canvas.height / this.cam.zoom / TILE;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
      ctx.strokeRect(ox + vx * scale, oy + vy * scale, vw * scale, vh * scale);
      this.mmGeom = { scale, ox, oy };
    }
  }

  function blend32(a, b, t) {
    const ar = a & 255, ag = (a >> 8) & 255, ab = (a >> 16) & 255;
    const br = b & 255, bg = (b >> 8) & 255, bb = (b >> 16) & 255;
    const r = (ar + (br - ar) * t) | 0, g = (ag + (bg - ag) * t) | 0, bl = (ab + (bb - ab) * t) | 0;
    return (255 << 24) | (bl << 16) | (g << 8) | r;
  }

  MB.Renderer = Renderer;
  MB.BUILDING_SPRITES = BS;
})();
