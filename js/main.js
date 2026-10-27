'use strict';
// MineBomb - game bootstrap: loop, input, abilities usage, power, achievements, saving
(function () {
  const U = MB.util, T = MB.T, TILES = MB.TILES;
  const A = MB.Abilities, C = MB.Civs, E = MB.Entities, S = MB.Storage;
  const TPS = MB.World.TPS;

  const PRESETS = {
    Starter: ['rain_cloud', 'spawn_human', 'bomb', 'tornado', 'paint_grass', 'grow_forest', 'lightning_strike', 'spawn_cow', 'found_civilization', 'inspect'],
    Nature: ['rain_cloud', 'grow_forest', 'wildflowers', 'fertilize', 'spread_grass', 'animal_sanctuary', 'create_lake', 'raise_land', 'restore_nature', 'inspect'],
    Builder: ['found_civilization', 'gift_gold', 'enlightenment', 'urban_boom', 'build_farm', 'expand_borders', 'bless_civilization', 'force_peace', 'spawn_hero', 'inspect'],
    Destruction: ['bomb', 'mega_bomb', 'nuke', 'meteor', 'tornado', 'wildfire', 'earthquake', 'tsunami', 'black_hole', 'inspect'],
    Monsters: ['zombie_outbreak', 'spawn_dragon', 'kaiju_attack', 'spawn_giant', 'wolf_pack', 'alien_invasion', 'release_the_kraken', 'spawn_hero', 'monster_bane', 'inspect'],
    Weather: ['rain_cloud', 'thunderstorm', 'snow_cloud', 'tornado', 'lightning_strike', 'heatwave', 'global_rain', 'clear_skies', 'rainbow', 'inspect'],
    Chaos: ['chaos', 'random_ability', 'wrath', 'sharknado', 'everyone_is_a_cow', 'candy_rain', 'pig_launch', 'duck_flood', 'grey_goo', 'inspect'],
  };
  const ACHIEVEMENTS = [
    { id: 'first_use', name: 'Hello World', icon: '👋', desc: 'Use your first ability.', test: (g, w) => w.playerStats.uses >= 1 },
    { id: 'rainmaker', name: 'Rainmaker', icon: '🌧️', desc: 'Summon 10 rain clouds.', test: (g, w) => w.playerStats.rains >= 10 },
    { id: 'bomber', name: 'Demolitions Expert', icon: '💣', desc: 'Set off 25 explosions.', test: (g, w) => w.playerStats.bombs >= 25 },
    { id: 'nuclear', name: 'Nuclear Option', icon: '☢️', desc: 'Use a nuke.', test: (g, w) => !!w.playerStats.abilities.nuke },
    { id: 'creator', name: 'Creator', icon: '🧬', desc: 'Spawn 200 creatures.', test: (g, w) => w.playerStats.spawns >= 200 },
    { id: 'founder', name: 'Founding Father', icon: '🏕️', desc: 'Found a civilization.', test: (g, w) => !!w.playerStats.abilities.found_civilization },
    { id: 'collector', name: 'Collector', icon: '🎒', desc: 'Use 50 different abilities.', test: (g, w) => Object.keys(w.playerStats.abilities).length >= 50 },
    { id: 'encyclopedia', name: 'Encyclopedia', icon: '📚', desc: 'Use 250 different abilities.', test: (g, w) => Object.keys(w.playerStats.abilities).length >= 250 },
    { id: 'omnipotent', name: 'Omnipotent', icon: '🌌', desc: 'Use 500 different abilities.', test: (g, w) => Object.keys(w.playerStats.abilities).length >= 500 },
    { id: 'medieval', name: 'Knights and Castles', icon: '🏰', desc: 'A civilization reaches the Medieval Era.', test: (g, w) => w.civs.some((c) => c.era >= 3) },
    { id: 'industrial', name: 'Smoke Stacks', icon: '🏭', desc: 'A civilization reaches the Industrial Age.', test: (g, w) => w.civs.some((c) => c.era >= 5) },
    { id: 'space', name: 'To The Stars', icon: '🚀', desc: 'A civilization reaches the Space Age.', test: (g, w) => w.civs.some((c) => c.era >= 8) },
    { id: 'launch', name: 'Liftoff', icon: '🛰️', desc: 'A rocket launches into space.', test: (g, w) => w.civs.some((c) => c.spaceLaunches > 0) },
    { id: 'metropolis', name: 'Metropolis', icon: '🏙️', desc: 'A civilization reaches 1000 population.', test: (g, w) => w.civs.some((c) => c.alive && c.pop >= 1000) },
    { id: 'million', name: 'Teeming', icon: '👥', desc: 'World population reaches 5000.', test: (g, w) => w.civs.reduce((s, c) => s + (c.alive ? c.pop : 0), 0) >= 5000 },
    { id: 'warmonger', name: 'Warmonger', icon: '⚔️', desc: 'Five wars are fought in one world.', test: (g, w) => w.civs.reduce((s, c) => s + c.warsFought, 0) >= 10 },
    { id: 'extinction', name: 'Extinction', icon: '💀', desc: 'Every civilization in a world has fallen (after having at least 3).', test: (g, w) => w.civs.length >= 3 && !w.civs.some((c) => c.alive) },
    { id: 'peacekeeper', name: 'Peacekeeper', icon: '☮️', desc: 'Toggle Peace on Earth.', test: (g, w) => !!w.flags.worldPeace },
    { id: 'kaiju', name: 'Monster Movie', icon: '🦖', desc: 'Unleash a kaiju.', test: (g, w) => !!w.playerStats.abilities.kaiju_attack || !!w.playerStats.abilities.spawn_kaiju },
    { id: 'dragonslayer', name: 'Dragonslayer', icon: '🐲', desc: 'A civilization slays a dragon.', test: (g, w) => w.log.some((e) => /slew the Dragon/.test(e.text)) },
    { id: 'flood', name: 'After Me, The Flood', icon: '🌊', desc: 'Raise the sea level.', test: (g, w) => !!w.playerStats.abilities.sea_level_rise },
    { id: 'colonist', name: 'New Horizons', icon: '⛵', desc: 'A civilization founds an overseas colony.', test: (g, w) => w.civs.some((c) => c.colonies > 0) },
    { id: 'tenciv', name: 'Crowded Planet', icon: '🌍', desc: 'Ten civilizations alive at once.', test: (g, w) => w.civs.filter((c) => c.alive).length >= 10 },
    { id: 'century', name: 'Century', icon: '🕰️', desc: 'A world reaches year 10.', test: (g, w) => w.year() >= 10 },
    { id: 'chaos', name: 'Agent of Chaos', icon: '🎲', desc: 'Turn on Chaos Mode.', test: (g, w) => !!w.flags.chaosMode },
    { id: 'duck', name: 'Quack', icon: '🦆', desc: 'Spawn rubber ducks.', test: (g, w) => !!w.playerStats.abilities.rubber_ducks || !!w.playerStats.abilities.duck_flood },
    { id: 'worship', name: 'Deity', icon: '🙇', desc: 'A civilization worships you.', test: (g, w) => w.civs.some((c) => c.religion === 'the Player') },
    { id: 'wonder', name: 'Wonderful', icon: '🏛️', desc: 'A wonder is completed.', test: (g, w) => { for (const b of w.buildings.values()) if (C.BUILDINGS[b.t].wonder && b.prog >= 1) return true; return false; } },
    { id: 'survivor', name: 'Survivalist', icon: '⚡', desc: 'Play in Challenge mode (creative off) for a day.', test: (g, w) => !g.settings.creative && g.challengeTicks >= MB.World.DAY_TICKS },
    { id: 'export', name: 'Archivist', icon: '📤', desc: 'Export a world to JSON.', test: (g) => g.exported },
  ];

  class Game {
    constructor() {
      this.settings = S.loadSettings();
      this.achievements = S.loadAchievements();
      this.PRESETS = PRESETS; this.ACHIEVEMENTS = ACHIEVEMENTS;
      this.canvas = document.getElementById('game');
      this.renderer = new MB.Renderer(this.canvas);
      this.renderer.show.borders = this.settings.showBorders !== false;
      this.renderer.show.territory = this.settings.showTerritory !== false;
      this.renderer.show.names = this.settings.showNames !== false;
      this.renderer.show.weather = this.settings.weatherFx !== false;
      this.renderer.show.particles = this.settings.particles !== false;
      document.body.classList.toggle('crt', !!this.settings.crt);
      document.body.classList.toggle('big-ui', !!this.settings.bigUI);
      this.hotbar = S.loadHotbar() || PRESETS.Starter.slice();
      while (this.hotbar.length < 10) this.hotbar.push(null);
      this.slot = 0;
      this.brushR = 3;
      this.power = 300; this.maxPower = 500;
      this.world = null;
      this.speed = 1; this.paused = false;
      this.acc = 0; this.lastTs = 0; this.lastSave = performance.now(); this.lastAchCheck = 0;
      this.pickedTile = null; this.clipboard = null; this.snapshot = null; this.bookmark = null; this.measureA = null; this.pendingPortal = null; this.capitalIdx = -1;
      this.challengeTicks = 0; this.exported = false;
      this.mouse = { x: 0, y: 0, wx: 0, wy: 0, down: false, button: -1, dragging: false, lastUse: 0, panStart: null, moved: 0 };
      this.keys = {};
      this.ui = new MB.UI(this);
      MB.game = this;
      this.bindInput();
      MB.audio.setVolume(this.settings.volume);
      MB.audio.muted = !!this.settings.muted; MB.audio.setVolume(this.settings.volume);
      const meta = S.loadMeta();
      const list = S.listWorlds();
      if (meta.lastWorld && list.some((w) => w.id === meta.lastWorld)) { if (!this.loadWorld(meta.lastWorld)) this.ui.openPanel('worlds'); }
      else this.ui.openPanel('worlds');
      requestAnimationFrame((ts) => this.loop(ts));
      window.addEventListener('resize', () => this.renderer.resize());
      window.addEventListener('beforeunload', () => { if (this.world) this.saveWorld(false); });
      document.addEventListener('visibilitychange', () => { if (document.hidden && this.world) this.saveWorld(false); this.lastTs = 0; });
    }

    // ---------- world management ----------
    newWorld(params) {
      this.ui.toast('Generating world...', 1500);
      setTimeout(() => {
        const w = new MB.World(params);
        try { w.generate(); } catch (err) { console.error(err); this.ui.toast('Generation failed: ' + err.message, 5000); return; }
        this.setWorld(w);
        this.saveWorld(false);
        this.ui.closePanel();
        this.ui.toast(`Welcome to ${w.name}! ${w.civs.length} tribes await your attention.`, 4000);
      }, 30);
    }
    loadWorld(id) {
      const w = S.loadWorld(id);
      if (!w) { this.ui.toast('Could not load that world.', 3000); return false; }
      this.setWorld(w);
      this.ui.closePanel();
      this.ui.toast(`Loaded ${w.name}.`, 2000);
      return true;
    }
    setWorld(w) {
      if (this.world && this.world !== w) this.saveWorld(false);
      this.world = w;
      this.renderer.resetWorld();
      this.renderer.follow = null;
      this.renderer.cam.zoom = this.canvas.width < 900 ? 1.5 : 2;
      const c = w.civs.find((x) => x.alive);
      if (c) this.renderer.centerOn(c.cx + 0.5, c.cy + 0.5); else this.renderer.centerOn(w.w / 2, w.h / 2);
      this.ui.closeInspector();
      this.ui.el.feed.innerHTML = '';
      this.pendingPortal = null; this.measureA = null; this.snapshot = null;
      MB.Particles.list.length = 0;
      const meta = S.loadMeta(); meta.lastWorld = w.id; S.saveMeta(meta);
      this.paused = false;
      this.ui.refreshHotbar();
    }
    saveWorld(manual) {
      if (!this.world) return;
      const r = S.saveWorld(this.world);
      this.lastSave = performance.now();
      if (manual) this.ui.toast(r.ok ? `Saved (${(r.size / 1024).toFixed(0)} KB).` : 'Save failed: browser storage is full. Export to JSON or delete old worlds.', 3000);
      else if (!r.ok) this.ui.toast('Autosave failed: storage full. Export your world!', 4000);
    }
    exportWorld() { if (!this.world) return; const n = S.exportWorld(this.world); this.exported = true; this.ui.toast(`Exported ${(n / 1024).toFixed(0)} KB JSON.`); }
    importFile(file) {
      const reader = new FileReader();
      reader.onload = () => { try { const w = S.importWorldJSON(reader.result); this.setWorld(w); this.saveWorld(false); this.ui.closePanel(); this.ui.toast(`Imported ${w.name}.`); } catch (err) { this.ui.toast('Import failed: ' + err.message, 5000); } };
      reader.readAsText(file);
    }
    screenshot() { try { const url = this.canvas.toDataURL('image/png'); const a = document.createElement('a'); a.href = url; a.download = `minebomb_${(this.world ? this.world.name : 'world').replace(/\W+/g, '_')}_${Date.now()}.png`; a.click(); this.ui.toast('Screenshot saved.'); } catch (e) { this.ui.toast('Screenshot failed.'); } }
    saveSettings() { S.saveSettings(this.settings); }
    saveHotbar() { S.saveHotbar(this.hotbar); }
    saveSnapshot() { if (!this.world) return; this.snapshot = JSON.stringify(this.world.serialize()); }
    restoreSnapshot() { if (!this.snapshot) return false; const w = MB.World.deserialize(JSON.parse(this.snapshot)); w.id = this.world.id; this.world = w; this.renderer.resetWorld(); this.ui.closeInspector(); return true; }
    copyArea(x, y, r) {
      const w = this.world; const tiles = [];
      w.forRadius(x, y, r, (tx, ty, i, d) => { tiles.push([tx - (x | 0), ty - (y | 0), w.tiles[i], w.height[i], w.moist[i]]); });
      this.clipboard = { r, tiles };
    }
    pasteArea(x, y) {
      const w = this.world, cb = this.clipboard; if (!cb) return;
      for (const [dx, dy, t, h, m] of cb.tiles) { const tx = (x | 0) + dx, ty = (y | 0) + dy; if (!w.inb(tx, ty)) continue; const i = w.idx(tx, ty); if (w.buildings.has(i)) continue; w.height[i] = h; w.moist[i] = m; w.setIdx(i, t); }
    }

    // ---------- hotbar / abilities ----------
    currentAbility() { const id = this.hotbar[this.slot]; return id ? A.byId[id] : null; }
    selectSlot(i, quiet) { this.slot = i; this.ui.refreshHotbar(); if (!quiet && MB.audio) MB.audio.play('select'); this.updateBrushColor(); }
    assignHotbar(i, id) { this.hotbar[i] = id; this.saveHotbar(); this.ui.refreshHotbar(); this.updateBrushColor(); }
    setBrush(r) { this.brushR = U.clamp(Math.round(r), 1, 30); this.ui.refreshHotbar(); }
    setSpeed(s) { this.speed = s; this.paused = false; this.ui.toast(`Speed ${s}×`, 800); }
    togglePause() { this.paused = !this.paused; this.ui.toast(this.paused ? 'Paused' : 'Resumed', 800); }
    updateBrushColor() { const ab = this.currentAbility(); const b = this.renderer.brush; b.color = ab ? (ab.align === 'good' ? '#7fff7f' : ab.align === 'evil' ? '#ff5f5f' : '#9fd3ff') : '#fff'; }
    effectiveRadius(ab) { if (!ab) return this.brushR; if (ab.mode === 'global' || ab.r === 0) return 0; if (ab.cat === 'Terrain' || ab.cat === 'Nature' || ab.mode === 'paint') return Math.max(0.5, this.brushR * (ab.r <= 1 ? 0.5 : 1)); return Math.max(0.5, ab.r + (this.brushR - 3) * 0.5); }
    useAbilityAt(ab, x, y, force) {
      if (!ab || !this.world) return false;
      const w = this.world;
      if (!this.settings.creative && ab.cost > 0) {
        if (this.power < ab.cost) { if (!force) { this.ui.toast(`Not enough power (${ab.cost} needed).`, 1200); if (MB.audio) MB.audio.play('error'); } return false; }
      }
      if (ab.cd && ab._last && performance.now() - ab._last < ab.cd) return false;
      if (this.settings.confirmDangerous && ab.cost >= 150 && ab.mode === 'global' && !force) { if (!confirm(`Really use ${ab.name}? This affects the whole world.`)) return false; }
      const ctx = A.makeCtx(this, w, x, y, this.effectiveRadius(ab), ab);
      try { ab.fn(ctx); } catch (err) { console.error('Ability error', ab.id, err); this.ui.toast(`${ab.name} fizzled (${err.message})`, 3000); return false; }
      ab._last = performance.now();
      if (!this.settings.creative) this.power = Math.max(0, this.power - ab.cost);
      w.playerStats.uses++;
      w.playerStats.abilities[ab.id] = (w.playerStats.abilities[ab.id] || 0) + 1;
      if (ab.cat === 'Tools') { /* no log */ } else if (ab.mode !== 'paint' && Math.random() < 0.15 && ab.cost >= 20) w.addLog(`The gods used ${ab.name}.`, 'player', x | 0, y | 0);
      if (MB.audio && ab.mode !== 'paint') MB.audio.play('click');
      return true;
    }

    // ---------- main loop ----------
    loop(ts) {
      requestAnimationFrame((t) => this.loop(t));
      if (!this.lastTs) this.lastTs = ts;
      let dt = (ts - this.lastTs) / 1000; this.lastTs = ts;
      if (dt > 0.25) dt = 0.25;
      this.renderer.resize();
      const w = this.world;
      if (w) {
        if (!this.paused && !(this.ui.panel && this.ui.panel !== 'inventory' && this.ui.panel !== 'civs' && this.ui.panel !== 'log' && this.ui.panel !== 'stats' && this.ui.panel !== 'settings' && this.ui.panel !== 'help' && this.ui.panel !== 'achievements' && this.ui.panel !== 'worlds')) {
          this.acc += dt * TPS * this.speed;
          let steps = 0;
          const maxSteps = this.speed >= 25 ? 60 : this.speed >= 10 ? 32 : 12;
          const t0 = performance.now();
          while (this.acc >= 1 && steps < maxSteps) {
            w.step(this);
            this.acc -= 1; steps++;
            if (performance.now() - t0 > 40) { this.acc = Math.min(this.acc, 2); break; }
            if (w.flags.chaosMode && w.tick % 60 === 0) this.chaosTick();
            if (!this.settings.creative) { this.challengeTicks++; this.power = Math.min(this.maxPower, this.power + 0.12 + (w.faithIncome || 0) * 0.01); }
          }
          if (this.acc > maxSteps) this.acc = 0;
        }
        this.handleKeys(dt);
        // continuous paint
        const m = this.mouse;
        if (m.down && m.button === 0 && !m.panning && !this.ui.panel) {
          const ab = this.currentAbility();
          if (ab && ab.mode === 'paint' && performance.now() - m.lastUse >= ab.rate) { this.pointerToWorld(); this.useAbilityAt(ab, m.wx, m.wy); m.lastUse = performance.now(); }
        }
        MB.Particles.update(dt * TPS);
        const br = this.renderer.brush;
        const ab = this.currentAbility();
        br.visible = !this.ui.panel && this.mouse.over !== false; br.x = this.mouse.wx; br.y = this.mouse.wy; br.r = this.effectiveRadius(ab) || 0.5;
        this.renderer.draw(this, dt);
        this.ui.update();
        if (this.settings.autosave > 0 && performance.now() - this.lastSave > this.settings.autosave * 1000) this.saveWorld(false);
        if (performance.now() - this.lastAchCheck > 2000) { this.lastAchCheck = performance.now(); this.checkAchievements(); }
      }
    }
    chaosTick() {
      const w = this.world;
      const pool = A.list.filter((a) => a.cat !== 'Tools' && a.mode !== 'global' && a.cost <= 60 && !a.id.startsWith('rename') && a.id !== 'chaos' && a.id !== 'give_name_sign');
      const ab = U.pick(pool);
      const i = w.randomTile(() => true, 1);
      const x = (i % w.w) + 0.5, y = ((i / w.w) | 0) + 0.5;
      MB.lib.castAbility(w, ab, x, y, ab.r, true);
      w.addLog(`Chaos: ${ab.name}!`, 'world', x | 0, y | 0);
    }
    checkAchievements() {
      const w = this.world; if (!w) return;
      for (const a of ACHIEVEMENTS) {
        if (this.achievements[a.id]) continue;
        let ok = false;
        try { ok = a.test(this, w); } catch (e) { ok = false; }
        if (ok) { this.achievements[a.id] = Date.now(); S.saveAchievements(this.achievements); this.ui.toast(`🏆 Achievement: ${a.name} — ${a.desc}`, 5000, 'ach'); if (MB.audio) MB.audio.play('achievement'); }
      }
    }

    // ---------- input ----------
    pointerToWorld() { const [wx, wy] = this.renderer.screenToWorld(this.mouse.x, this.mouse.y); this.mouse.wx = wx; this.mouse.wy = wy; }
    bindInput() {
      const cv = this.canvas, m = this.mouse, r = this.renderer;
      const unlockAudio = () => { if (MB.audio.init()) { if (MB.audio.ctx.state === 'suspended') MB.audio.ctx.resume(); } };
      cv.addEventListener('contextmenu', (e) => e.preventDefault());
      cv.addEventListener('pointerdown', (e) => {
        unlockAudio();
        if (e.pointerType === 'touch') return;
        m.x = e.clientX; m.y = e.clientY; this.pointerToWorld();
        m.down = true; m.button = e.button; m.moved = 0; m.panning = false;
        cv.setPointerCapture(e.pointerId);
        if (e.button === 0) {
          if (e.shiftKey) { this.ui.inspectAt(m.wx, m.wy); m.inspecting = true; return; }
          if (!this.world) return;
          const ab = this.currentAbility();
          if (!ab) { this.ui.toast('No ability in this slot. Press E to choose one.', 1500); return; }
          this.useAbilityAt(ab, m.wx, m.wy); m.lastUse = performance.now();
        } else { m.panning = true; m.panStart = { x: e.clientX, y: e.clientY, cx: r.cam.x, cy: r.cam.y }; }
      });
      cv.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        m.x = e.clientX; m.y = e.clientY; m.over = true; this.pointerToWorld();
        if (m.down && m.panning && m.panStart) {
          const dx = e.clientX - m.panStart.x, dy = e.clientY - m.panStart.y; m.moved += Math.abs(dx) + Math.abs(dy);
          r.cam.x = m.panStart.cx - dx / r.cam.zoom; r.cam.y = m.panStart.cy - dy / r.cam.zoom; r.follow = null;
          m.panStart.x = e.clientX; m.panStart.y = e.clientY; m.panStart.cx = r.cam.x; m.panStart.cy = r.cam.y;
        }
      });
      const up = (e) => {
        if (e.pointerType === 'touch') return;
        if (m.down && m.panning && m.moved < 6 && m.button === 2 && this.world) this.ui.inspectAt(m.wx, m.wy);
        m.down = false; m.panning = false; m.inspecting = false; m.panStart = null;
      };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('pointerleave', () => { m.over = false; });
      cv.addEventListener('pointerenter', () => { m.over = true; });
      cv.addEventListener('wheel', (e) => { e.preventDefault(); if (e.shiftKey) { this.setBrush(this.brushR + (e.deltaY > 0 ? -1 : 1)); return; } r.zoomAt(e.clientX, e.clientY, e.deltaY > 0 ? 1 / 1.3 : 1.3); }, { passive: false });
      // touch
      const touches = new Map();
      let pinch = null, tapStart = null;
      cv.addEventListener('touchstart', (e) => { e.preventDefault(); unlockAudio(); for (const t of e.changedTouches) touches.set(t.identifier, { x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY }); if (touches.size === 1) { tapStart = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY, t: performance.now(), moved: 0 }; } if (touches.size === 2) { const [a, b] = Array.from(touches.values()); pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: r.cam.zoom, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; tapStart = null; } }, { passive: false });
      cv.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) { const o = touches.get(t.identifier); if (!o) continue; if (touches.size === 1) { const dx = t.clientX - o.x, dy = t.clientY - o.y; r.cam.x -= dx / r.cam.zoom; r.cam.y -= dy / r.cam.zoom; r.follow = null; if (tapStart) tapStart.moved += Math.abs(dx) + Math.abs(dy); } o.x = t.clientX; o.y = t.clientY; } if (touches.size === 2 && pinch) { const [a, b] = Array.from(touches.values()); const d = Math.hypot(a.x - b.x, a.y - b.y); const [wx, wy] = r.screenToWorld(pinch.cx, pinch.cy); r.cam.zoom = U.clamp(pinch.zoom * (d / pinch.d), 0.35, 8); const [nx, ny] = r.screenToWorld(pinch.cx, pinch.cy); r.cam.x += (nx - wx) * 8; r.cam.y += (ny - wy) * 8; } m.x = e.changedTouches[0].clientX; m.y = e.changedTouches[0].clientY; this.pointerToWorld(); }, { passive: false });
      cv.addEventListener('touchend', (e) => { e.preventDefault(); for (const t of e.changedTouches) touches.delete(t.identifier); if (touches.size < 2) pinch = null; if (tapStart && touches.size === 0 && tapStart.moved < 10 && performance.now() - tapStart.t < 500) { m.x = tapStart.x; m.y = tapStart.y; this.pointerToWorld(); const ab = this.currentAbility(); if (ab && this.world) this.useAbilityAt(ab, m.wx, m.wy); } tapStart = null; }, { passive: false });
      // keys
      window.addEventListener('keydown', (e) => {
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') { if (e.key === 'Escape') { e.target.blur(); } return; }
        unlockAudio();
        this.keys[e.key.toLowerCase()] = true;
        const k = e.key;
        if (k === 'Escape') { if (this.ui.inspect) this.ui.closeInspector(); else if (this.ui.panel) this.ui.closePanel(); else this.ui.openPanel('worlds'); return; }
        if (!this.world) return;
        if (e.ctrlKey || e.metaKey) { if (k.toLowerCase() === 's') { e.preventDefault(); this.saveWorld(true); } else if (k.toLowerCase() === 'z') { e.preventDefault(); if (this.restoreSnapshot()) this.ui.toast('Snapshot restored.'); } return; }
        if (k >= '0' && k <= '9') { this.selectSlot(k === '0' ? 9 : +k - 1); return; }
        switch (k.toLowerCase()) {
          case 'e': case 'i': this.ui.togglePanel('inventory'); break;
          case 'c': this.ui.togglePanel('civs'); break;
          case 'l': this.ui.togglePanel('log'); break;
          case 'h': this.ui.togglePanel('help'); break;
          case ' ': e.preventDefault(); this.togglePause(); break;
          case '+': case '=': { const sp = [1, 2, 5, 10, 25]; const i = sp.indexOf(this.speed); this.setSpeed(sp[Math.min(sp.length - 1, i + 1)]); break; }
          case '-': case '_': { const sp = [1, 2, 5, 10, 25]; const i = sp.indexOf(this.speed); this.setSpeed(sp[Math.max(0, i - 1)]); break; }
          case '[': this.setBrush(this.brushR - 1); break;
          case ']': this.setBrush(this.brushR + 1); break;
          case 'f': this.renderer.follow = null; break;
          case 'g': this.renderer.show.grid = !this.renderer.show.grid; this.renderer.invalidateAll(); break;
          case 'b': this.renderer.show.borders = !this.renderer.show.borders; this.renderer.invalidateAll(); break;
          case 'n': this.renderer.show.names = !this.renderer.show.names; break;
          case 'o': { const ov = MB.OVERLAYS; const i = ov.indexOf(this.renderer.show.overlay); this.renderer.show.overlay = ov[(i + 1) % ov.length]; this.ui.toast(`Overlay: ${this.renderer.show.overlay}`, 1000); break; }
          case 'm': { const mu = MB.audio.toggleMute(); this.settings.muted = mu; this.saveSettings(); this.ui.toast(mu ? 'Muted' : 'Sound on', 800); break; }
          case 'p': this.screenshot(); break;
          case 'q': { const ab = A.byId.random_ability; this.useAbilityAt(ab, this.mouse.wx, this.mouse.wy); break; }
          case 'tab': { e.preventDefault(); A.byId.go_to_capital.fn(A.makeCtx(this, this.world, 0, 0, 0, null)); break; }
        }
      });
      window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
      window.addEventListener('blur', () => { this.keys = {}; this.mouse.down = false; });
    }
    handleKeys(dt) {
      if (this.ui.panel) return;
      const k = this.keys, r = this.renderer;
      const sp = (k.shift ? 900 : 450) * dt / r.cam.zoom;
      let dx = 0, dy = 0;
      if (k.w || k.arrowup) dy -= sp; if (k.s || k.arrowdown) dy += sp; if (k.a || k.arrowleft) dx -= sp; if (k.d || k.arrowright) dx += sp;
      if (dx || dy) { r.cam.x += dx; r.cam.y += dy; r.follow = null; }
    }
  }

  window.addEventListener('DOMContentLoaded', () => { try { window.game = new Game(); } catch (err) { console.error(err); document.body.insertAdjacentHTML('beforeend', `<div style="position:fixed;inset:0;background:#000;color:#f66;padding:20px;font-family:monospace;z-index:99">MineBomb failed to start: ${U.escapeHtml(err.message)}<br><pre>${U.escapeHtml(err.stack || '')}</pre></div>`); } });
})();
