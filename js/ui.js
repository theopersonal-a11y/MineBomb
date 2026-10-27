'use strict';
// MineBomb - UI: hotbar, inventory, panels, inspector, feed, toasts, world menu
(function () {
  const U = MB.util, T = MB.T, TILES = MB.TILES;
  const C = MB.Civs, E = MB.Entities, A = MB.Abilities;
  const esc = U.escapeHtml;
  const $ = (id) => document.getElementById(id);

  class UI {
    constructor(game) {
      this.g = game;
      this.panel = null;
      this.invCat = 'All';
      this.invSearch = '';
      this.inspect = null;
      this.frame = 0;
      this.feedCount = 0;
      this.logFilter = 'all';
      this.civSort = 'pop';
      this.el = {
        topbar: $('topbar'), clock: $('clock'), weather: $('weather'), worldName: $('world-name'), pop: $('stat-pop'), civs: $('stat-civs'), ents: $('stat-ents'),
        powerBar: $('power-bar'), powerText: $('power-text'), feed: $('feed'), minimap: $('minimap'), inspector: $('inspector'), hotbar: $('hotbar'),
        abIcon: $('ab-icon'), abName: $('ab-name'), abDesc: $('ab-desc'), brushSize: $('brush-size'), toasts: $('toasts'), modal: $('modal'), modalTitle: $('modal-title'), modalContent: $('modal-content'), pause: $('btn-pause'),
      };
      $('btn-menu').onclick = () => this.openPanel('worlds');
      $('btn-inv').onclick = () => this.togglePanel('inventory');
      $('btn-civs').onclick = () => this.togglePanel('civs');
      $('btn-log').onclick = () => this.togglePanel('log');
      $('btn-stats').onclick = () => this.togglePanel('stats');
      $('btn-settings').onclick = () => this.togglePanel('settings');
      $('btn-help').onclick = () => this.togglePanel('help');
      $('modal-close').onclick = () => this.closePanel();
      this.el.modal.addEventListener('mousedown', (e) => { if (e.target === this.el.modal && this.g.world) this.closePanel(); });
      this.el.pause.onclick = () => this.g.togglePause();
      document.querySelectorAll('.speed').forEach((b) => { b.onclick = () => this.g.setSpeed(+b.dataset.speed); });
      this.el.minimap.addEventListener('mousedown', (e) => this.minimapClick(e));
      this.el.minimap.addEventListener('mousemove', (e) => { if (e.buttons & 1) this.minimapClick(e); });
      $('import-file').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) this.g.importFile(f); e.target.value = ''; });
      this.buildHotbar();
    }

    // ---------- toasts ----------
    toast(text, ms = 2800, cls = '') {
      const t = U.el('div', { class: 'toast ' + cls, text });
      this.el.toasts.appendChild(t);
      while (this.el.toasts.children.length > 4) this.el.toasts.removeChild(this.el.toasts.firstChild);
      setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; setTimeout(() => t.remove(), 400); }, ms);
    }

    // ---------- hotbar ----------
    buildHotbar() {
      const hb = this.el.hotbar;
      hb.innerHTML = '';
      this.slots = [];
      for (let i = 0; i < 10; i++) {
        const s = U.el('div', { class: 'slot', title: '' });
        s.appendChild(U.el('span', { class: 'key', text: String((i + 1) % 10) }));
        s.appendChild(U.el('span', { class: 'ic' }));
        s.appendChild(U.el('span', { class: 'nm' }));
        s.appendChild(U.el('span', { class: 'cost' }));
        s.addEventListener('mousedown', (e) => { e.preventDefault(); if (e.button === 0) { this.g.selectSlot(i); } else if (e.button === 2) { this.g.assignHotbar(i, null); } });
        s.addEventListener('contextmenu', (e) => e.preventDefault());
        s.addEventListener('dblclick', () => { this.g.selectSlot(i); this.openPanel('inventory'); });
        s.addEventListener('dragover', (e) => { e.preventDefault(); s.classList.add('dragover'); });
        s.addEventListener('dragleave', () => s.classList.remove('dragover'));
        s.addEventListener('drop', (e) => { e.preventDefault(); s.classList.remove('dragover'); const id = e.dataTransfer.getData('text/plain'); if (id && A.byId[id]) { this.g.assignHotbar(i, id); this.g.selectSlot(i); } });
        hb.appendChild(s); this.slots.push(s);
      }
      this.refreshHotbar();
    }
    refreshHotbar() {
      const g = this.g;
      for (let i = 0; i < 10; i++) {
        const s = this.slots[i], id = g.hotbar[i], ab = id ? A.byId[id] : null;
        s.className = 'slot' + (i === g.slot ? ' selected' : '') + (ab ? ' ' + ab.align : ' empty');
        s.children[1].textContent = ab ? ab.icon : '';
        s.children[2].textContent = ab ? ab.name : '';
        s.children[3].textContent = ab && ab.cost && !g.settings.creative ? ab.cost : '';
        s.title = ab ? `${ab.name}\n${ab.desc}` : 'Empty slot. Open Abilities (E) and click an ability to assign.';
      }
      const ab = g.currentAbility();
      this.el.abIcon.textContent = ab ? ab.icon : '';
      this.el.abName.textContent = ab ? ab.name : 'No ability selected';
      this.el.abDesc.textContent = ab ? `${ab.desc}${ab.mode === 'paint' ? ' (hold to paint)' : ab.mode === 'global' ? ' (world-wide)' : ''}` : 'Press E to open your abilities.';
      this.el.brushSize.textContent = g.brushR;
    }

    // ---------- per-frame update ----------
    update() {
      this.frame++;
      const g = this.g, w = g.world;
      if (!w) return;
      if (this.frame % 10 === 0) {
        this.el.clock.textContent = `Year ${w.year()} · ${w.season()} · Day ${(w.day() % (MB.World.DAYS_PER_SEASON * 4)) + 1} · ${U.pad2(Math.floor(w.hour()))}:${U.pad2(Math.floor((w.hour() % 1) * 60))}`;
        const WI = { clear: '☀️ Clear', rain: '🌧️ Rain', storm: '⛈️ Storm', snow: '🌨️ Snow', fog: '🌫️ Fog', heat: '🥵 Heatwave', cloudy: '☁️ Cloudy', windy: '💨 Windy', acid: '🧪 Acid rain', monsoon: '🌊 Monsoon' };
        this.el.weather.textContent = (WI[w.weather.type] || w.weather.type) + (w.weather.lock ? ' 🔒' : '') + (w.flags.iceAge ? ' 🧊' : '') + (w.flags.warming ? ' 🌡️' : '');
        let pop = 0, civs = 0;
        for (const c of w.civs) if (c.alive) { pop += c.pop; civs++; }
        this.el.pop.textContent = `👥 ${U.fmt(pop)}`;
        this.el.civs.textContent = `🏛️ ${civs}`;
        this.el.ents.textContent = `🐾 ${U.fmt(w.entities.length)}`;
        this.el.worldName.textContent = w.name;
        if (g.settings.creative) { this.el.powerBar.style.width = '100%'; this.el.powerText.textContent = '∞ creative'; }
        else { this.el.powerBar.style.width = `${(g.power / g.maxPower) * 100}%`; this.el.powerText.textContent = `⚡ ${Math.floor(g.power)}/${g.maxPower}`; }
        this.el.pause.textContent = g.paused ? '▶' : '⏸';
        this.el.pause.classList.toggle('active', g.paused);
        document.querySelectorAll('.speed').forEach((b) => b.classList.toggle('active', +b.dataset.speed === g.speed && !g.paused));
      }
      if (w.pendingEvents.length) { for (const ev of w.pendingEvents) this.addFeed(ev); w.pendingEvents.length = 0; }
      if (this.frame % 3 === 0 && this.el.minimap.offsetParent) g.renderer.drawMinimap(w, this.el.minimap);
      if (this.inspect && this.frame % 20 === 0) this.renderInspector();
      if (this.panel === 'civs' && this.frame % 60 === 0) this.renderCivs();
    }
    addFeed(ev) {
      if (this.g.settings.eventFeed === false) return;
      const f = this.el.feed;
      const item = U.el('div', { class: 'feed-item ' + ev.kind, text: ev.text });
      if (ev.x != null) item.onclick = () => { this.g.renderer.follow = null; this.g.renderer.centerOn(ev.x + 0.5, ev.y + 0.5); };
      f.insertBefore(item, f.firstChild);
      while (f.children.length > 8) f.removeChild(f.lastChild);
      setTimeout(() => item.classList.add('fade'), 9000);
      setTimeout(() => { if (item.parentNode) item.remove(); }, 20000);
    }
    minimapClick(e) {
      const r = this.g.renderer; if (!r.mmGeom || !this.g.world) return;
      const rect = this.el.minimap.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (this.el.minimap.width / rect.width), my = (e.clientY - rect.top) * (this.el.minimap.height / rect.height);
      const wx = (mx - r.mmGeom.ox) / r.mmGeom.scale, wy = (my - r.mmGeom.oy) / r.mmGeom.scale;
      r.follow = null; r.centerOn(wx, wy);
    }

    // ---------- panels ----------
    togglePanel(name) { if (this.panel === name) this.closePanel(); else this.openPanel(name); }
    openPanel(name, opts) {
      this.panel = name; this.panelOpts = opts || {};
      this.el.modal.classList.remove('hidden');
      $('modal-close').style.visibility = this.g.world ? 'visible' : 'hidden';
      const titles = { inventory: '🎒 Abilities', civs: '🏛️ Civilizations', log: '📜 Chronicle', stats: '📈 World Statistics', settings: '⚙️ Settings', help: '❔ Help', worlds: '🌍 MineBomb - Worlds', achievements: '🏆 Achievements' };
      this.el.modalTitle.textContent = titles[name] || name;
      const fn = { inventory: 'renderInventory', civs: 'renderCivs', log: 'renderLog', stats: 'renderStats', settings: 'renderSettings', help: 'renderHelp', worlds: 'renderWorlds', achievements: 'renderAchievements' }[name];
      if (fn) this[fn]();
      if (MB.audio) MB.audio.play('open');
    }
    closePanel() { if (!this.g.world) return; this.panel = null; this.el.modal.classList.add('hidden'); if (MB.audio) MB.audio.play('close'); }

    // ---------- inventory ----------
    renderInventory() {
      const g = this.g, mc = this.el.modalContent;
      mc.innerHTML = '';
      const cats = ['All', 'Favorites', 'Good', 'Evil'].concat(A.CATS);
      const tabs = U.el('div', { class: 'tabs' });
      for (const c of cats) tabs.appendChild(U.el('div', { class: 'tab' + (this.invCat === c ? ' active' : ''), text: (A.CAT_ICONS[c] ? A.CAT_ICONS[c] + ' ' : c === 'Favorites' ? '★ ' : c === 'Good' ? '😇 ' : c === 'Evil' ? '😈 ' : '') + c, onclick: () => { this.invCat = c; this.renderInventory(); } }));
      mc.appendChild(tabs);
      const row = U.el('div', { class: 'row' });
      const search = U.el('input', { type: 'text', placeholder: 'Search 500+ abilities...', value: this.invSearch, style: 'flex:1;min-width:200px' });
      search.oninput = () => { this.invSearch = search.value; this.renderGrid(); };
      row.appendChild(search);
      row.appendChild(U.el('span', { class: 'small', text: `Selected slot: ${(g.slot + 1) % 10}. Click an ability to put it there (then the next slot is selected). Right-click = favorite. Drag onto a slot also works.` }));
      const presets = U.el('div', { class: 'row' });
      presets.appendChild(U.el('span', { class: 'small', text: 'Loadouts:' }));
      for (const [nm, ids] of Object.entries(g.PRESETS)) presets.appendChild(U.el('button', { class: 'tbtn', text: nm, onclick: () => { g.hotbar = ids.slice(); g.saveHotbar(); this.refreshHotbar(); this.renderGrid(); this.toast(`Loadout: ${nm}`); } }));
      presets.appendChild(U.el('button', { class: 'tbtn', text: '🎲 Random', onclick: () => { const pool = A.list.filter((a) => a.cat !== 'Tools'); g.hotbar = Array.from({ length: 10 }, () => U.pick(pool).id); g.saveHotbar(); this.refreshHotbar(); this.renderGrid(); } }));
      presets.appendChild(U.el('span', { class: 'small', id: 'ab-count', text: `${A.list.length} abilities total` }));
      mc.appendChild(row); mc.appendChild(presets);
      this.grid = U.el('div', { class: 'ab-grid' });
      mc.appendChild(this.grid);
      this.renderGrid();
      setTimeout(() => search.focus(), 50);
    }
    renderGrid() {
      const g = this.g, grid = this.grid;
      grid.innerHTML = '';
      const q = this.invSearch.trim().toLowerCase();
      const favs = g.settings.favorites || [];
      let list = A.list;
      if (this.invCat === 'Favorites') list = list.filter((a) => favs.includes(a.id));
      else if (this.invCat === 'Good') list = list.filter((a) => a.align === 'good');
      else if (this.invCat === 'Evil') list = list.filter((a) => a.align === 'evil');
      else if (this.invCat !== 'All') list = list.filter((a) => a.cat === this.invCat);
      if (q) list = list.filter((a) => a.name.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q) || a.cat.toLowerCase().includes(q));
      const frag = document.createDocumentFragment();
      let n = 0;
      for (const ab of list) {
        if (n++ > 600) break;
        const card = U.el('div', { class: `ab-card ${ab.align}${favs.includes(ab.id) ? ' fav' : ''}${g.hotbar.includes(ab.id) ? ' inhot' : ''}`, draggable: 'true', title: `${ab.name} (${ab.cat})\n${ab.desc}\nCost: ${ab.cost} · Radius: ${ab.r} · ${ab.mode}` });
        card.appendChild(U.el('div', { class: 'ic', text: ab.icon }));
        card.appendChild(U.el('div', { class: 'nm', text: ab.name }));
        card.appendChild(U.el('div', { class: 'ds', text: ab.desc }));
        card.appendChild(U.el('div', { class: 'meta', text: `${ab.mode === 'paint' ? '🖌️' : ab.mode === 'global' ? '🌐' : ''}${ab.cost ? ' ⚡' + ab.cost : ''}` }));
        card.onclick = () => { g.assignHotbar(g.slot, ab.id); this.toast(`${ab.icon} ${ab.name} → slot ${(g.slot + 1) % 10}`, 1200); g.selectSlot((g.slot + 1) % 10, true); this.renderGrid(); };
        card.oncontextmenu = (e) => { e.preventDefault(); const f = g.settings.favorites = g.settings.favorites || []; const i = f.indexOf(ab.id); if (i >= 0) f.splice(i, 1); else f.push(ab.id); g.saveSettings(); this.renderGrid(); };
        card.ondragstart = (e) => { e.dataTransfer.setData('text/plain', ab.id); };
        frag.appendChild(card);
      }
      grid.appendChild(frag);
      if (!list.length) grid.appendChild(U.el('div', { class: 'small', text: 'Nothing matches.' }));
    }

    // ---------- civs ----------
    renderCivs() {
      const g = this.g, w = g.world, mc = this.el.modalContent;
      if (!w) return;
      mc.innerHTML = '';
      const alive = w.civs.filter((c) => c.alive);
      const sorters = { pop: (a, b) => b.pop - a.pop, era: (a, b) => b.era - a.era || b.pop - a.pop, name: (a, b) => a.name.localeCompare(b.name), happy: (a, b) => b.happiness - a.happiness, tiles: (a, b) => b.tiles.size - a.tiles.size, soldiers: (a, b) => b.soldiers - a.soldiers, gold: (a, b) => b.gold - a.gold };
      alive.sort(sorters[this.civSort] || sorters.pop);
      mc.appendChild(U.el('div', { class: 'small', text: `${alive.length} living civilizations · ${w.deadCivs.length} fallen. Click a row to inspect and jump there. Click headers to sort.` }));
      const tbl = U.el('table', { class: 'civs' });
      const head = U.el('tr');
      for (const [k, lbl] of [['name', 'Civilization'], ['era', 'Era'], ['pop', 'Pop'], ['happy', 'Happy'], ['tiles', 'Land'], ['soldiers', 'Army'], ['gold', 'Gold'], ['x', 'Status']]) head.appendChild(U.el('th', { text: lbl, onclick: () => { if (k !== 'x') { this.civSort = k; this.renderCivs(); } } }));
      tbl.appendChild(head);
      for (const c of alive) {
        const tr = U.el('tr');
        tr.appendChild(U.el('td', { html: `<span class="swatch" style="background:${c.color}"></span>${esc(C.fullName(c))}` }));
        tr.appendChild(U.el('td', { text: `${C.ERA_ICONS[c.era]} ${C.ERAS[c.era]}` }));
        tr.appendChild(U.el('td', { text: U.fmt(c.pop) }));
        tr.appendChild(U.el('td', { html: `<span class="minibar"><div style="width:${c.happiness}%;background:${c.happiness > 50 ? '#4caf50' : c.happiness > 25 ? '#ffd93d' : '#e63946'}"></div></span>` }));
        tr.appendChild(U.el('td', { text: c.tiles.size }));
        tr.appendChild(U.el('td', { text: c.soldiers }));
        tr.appendChild(U.el('td', { text: U.fmt(c.gold) }));
        const wars = Object.keys(c.wars).length, allies = Object.keys(c.allies).length;
        tr.appendChild(U.el('td', { text: `${wars ? '⚔️' + wars + ' ' : ''}${allies ? '🤝' + allies + ' ' : ''}${c.plague ? '☣️ ' : ''}${c.goldenAge ? '🌟 ' : ''}${c.darkAge ? '🕯️ ' : ''}${c.famine > 5 ? '🍽️ ' : ''}${c.flags.blessed ? '🙌 ' : ''}${c.flags.cursed ? '🪬 ' : ''}` }));
        tr.onclick = () => { this.closePanel(); this.inspectCiv(c); g.renderer.follow = null; g.renderer.centerOn(c.cx + 0.5, c.cy + 0.5); };
        tbl.appendChild(tr);
      }
      mc.appendChild(tbl);
      if (w.deadCivs.length) {
        mc.appendChild(U.el('h4', { text: 'Fallen civilizations' }));
        for (const d of w.deadCivs.slice().reverse().slice(0, 30)) mc.appendChild(U.el('div', { class: 'hist', html: `<span class="swatch" style="background:${d.color || '#666'}"></span>${esc(d.name)} — ${esc(d.reason)} (reached ${C.ERAS[d.era]}, peak pop ${U.fmt(d.maxPop)}, year ${Math.floor(d.died / MB.World.DAY_TICKS / (MB.World.DAYS_PER_SEASON * 4)) + 1})` }));
      }
    }

    // ---------- inspector ----------
    inspectAt(x, y) {
      const w = this.g.world; if (!w) return;
      const e = w.nearest(x, y, 1.5, (o) => o.kind !== 'special' || o.type === 'cloud' || o.type === 'tornado' || o.type === 'blackhole' || o.type === 'shield');
      if (e) return this.inspectEntity(e);
      const tx = x | 0, ty = y | 0;
      if (!w.inb(tx, ty)) return;
      const civ = w.civAt(tx, ty);
      const b = w.buildingAt(tx, ty);
      if (b && civ) return this.inspectCiv(civ, { x: tx, y: ty });
      if (civ) return this.inspectCiv(civ, { x: tx, y: ty });
      this.inspectTile(tx, ty);
    }
    inspectCiv(civ, tile) { this.inspect = { type: 'civ', civ, tile }; this.renderInspector(); }
    inspectEntity(e) { this.inspect = { type: 'ent', e }; this.renderInspector(); }
    inspectTile(x, y) { this.inspect = { type: 'tile', x, y }; this.renderInspector(); }
    closeInspector() { this.inspect = null; this.el.inspector.classList.add('hidden'); }
    renderInspector() {
      const ins = this.inspect, w = this.g.world, g = this.g;
      if (!ins || !w) return this.closeInspector();
      const box = this.el.inspector;
      box.classList.remove('hidden');
      box.innerHTML = '';
      const closeBtn = U.el('span', { class: 'close', text: '✕', onclick: () => this.closeInspector() });
      const act = (label, abId, cls) => U.el('button', { class: 'tbtn ' + (cls || ''), text: label, onclick: () => { const ab = A.byId[abId]; if (!ab) return; const t = ins.type === 'civ' ? ins.civ : null; g.useAbilityAt(ab, t ? t.cx + 0.5 : (ins.e ? ins.e.x : ins.x + 0.5), t ? t.cy + 0.5 : (ins.e ? ins.e.y : ins.y + 0.5), true); setTimeout(() => this.renderInspector(), 50); } });
      if (ins.type === 'civ') {
        const c = ins.civ;
        if (!c.alive) { box.appendChild(U.el('h3', { text: `${C.fullName(c)} (fallen)` })); box.appendChild(closeBtn); return; }
        const h = U.el('h3', { html: `<span><span class="swatch" style="background:${c.color}"></span>${esc(C.fullName(c))}</span>` }); h.appendChild(closeBtn); box.appendChild(h);
        box.appendChild(U.el('div', { class: 'small', text: `${C.ERA_ICONS[c.era]} ${C.ERAS[c.era]} · ${c.gov} · ${c.leader.title} ${c.leader.name}${c.religion ? ' · worships ' + c.religion : ''}` }));
        box.appendChild(U.el('div', { class: 'small', text: `Traits: ${c.traits.join(', ')} · Founded year ${Math.floor(c.founded / MB.World.DAY_TICKS / 20) + 1}` }));
        const y = c.yields || {};
        const kv = U.el('div', { class: 'kv' });
        const add = (k, v) => kv.appendChild(U.el('div', { html: `<span>${k}</span> <b>${v}</b>` }));
        add('Population', `${U.fmt(c.pop)} / ${U.fmt(c.housing || 0)} housing`);
        add('Happiness', `${Math.round(c.happiness)}%${c.unrest > 20 ? ' ⚠️ unrest' : ''}`);
        add('Food', `${U.fmt(c.food)} (${(y.food || 0).toFixed(1)}/t, eats ${(c.pop * 0.06).toFixed(1)})`);
        add('Wood / Stone', `${U.fmt(c.wood)} / ${U.fmt(c.stone)}`);
        add('Iron / Gold', `${U.fmt(c.iron)} / ${U.fmt(c.gold)}`);
        add('Science', `${U.fmt(c.science)} / ${C.ERA_COST[c.era] === Infinity ? 'MAX' : U.fmt(C.ERA_COST[c.era])}`);
        add('Culture / Faith', `${U.fmt(c.culture)} / ${U.fmt(c.faith)}`);
        add('Land / Buildings', `${c.tiles.size} / ${c.buildings.size}`);
        add('Soldiers', `${c.soldiers}${c.fear > 10 ? ' · fear ' + Math.round(c.fear) : ''}`);
        add('Colonies / Space', `${c.colonies} / ${c.spaceLaunches || 0} launches`);
        add('Wars fought', c.warsFought);
        add('Status', `${c.plague ? '☣️ plague ' : ''}${c.goldenAge ? '🌟 golden age ' : ''}${c.darkAge ? '🕯️ dark age ' : ''}${c.flags.blessed ? '🙌 blessed ' : ''}${c.flags.cursed ? '🪬 cursed ' : ''}${c.famine > 5 ? '🍽️ famine ' : ''}${c.immune ? '💉 immune ' : ''}` || 'normal');
        box.appendChild(kv);
        box.appendChild(U.el('div', { class: 'bar', html: `<div style="width:${Math.min(100, (c.science / (C.ERA_COST[c.era] || 1)) * 100)}%;background:#7fd1ff"></div>` }));
        // relations
        const others = w.civs.filter((o) => o.alive && o !== c);
        if (others.length) {
          box.appendChild(U.el('div', { class: 'small', text: 'Relations:' }));
          for (const o of others.slice(0, 12)) { const v = Math.round(c.relations[o.id] || 0); box.appendChild(U.el('div', { class: 'rel', html: `<span><span class="swatch" style="background:${o.color}"></span>${esc(o.name)}</span><span class="val ${v >= 0 ? 'pos' : 'neg'}">${c.wars[o.id] ? '⚔️ WAR ' : c.allies[o.id] ? '🤝 ally ' : ''}${v > 0 ? '+' : ''}${v}</span>` })); }
        }
        if (c.history.length) { box.appendChild(U.el('div', { class: 'small', text: 'History:' })); for (const h2 of c.history.slice(-6).reverse()) box.appendChild(U.el('div', { class: 'hist', text: `Y${Math.floor(h2.t / MB.World.DAY_TICKS / 20) + 1}: ${h2.text}` })); }
        const acts = U.el('div', { class: 'actions' });
        acts.appendChild(U.el('button', { class: 'tbtn', text: '📍 Center', onclick: () => { g.renderer.follow = null; g.renderer.centerOn(c.cx + 0.5, c.cy + 0.5); } }));
        acts.appendChild(act('💰 Gift gold', 'gift_gold', 'good')); acts.appendChild(act('🍖 Gift food', 'gift_food', 'good')); acts.appendChild(act('🙌 Bless', 'bless_civilization', 'good'));
        acts.appendChild(act('💡 Era up', 'enlightenment', 'good')); acts.appendChild(act('🕊️ Peace', 'force_peace', 'good')); acts.appendChild(act('🏘️ Houses', 'urban_boom', 'good'));
        acts.appendChild(act('⚔️ War', 'declare_war', 'danger')); acts.appendChild(act('☣️ Plague', 'plague', 'danger')); acts.appendChild(act('🪬 Hex', 'hex', 'danger')); acts.appendChild(act('💀 Doom', 'doom_civilization', 'danger'));
        box.appendChild(acts);
      } else if (ins.type === 'ent') {
        const e = ins.e;
        if (e.dead) { this.closeInspector(); return; }
        const d = e.def;
        const h = U.el('h3', { html: `<span>${d.icon} ${esc(e.name || d.name)}</span>` }); h.appendChild(closeBtn); box.appendChild(h);
        const civ = e.civ >= 0 ? w.civs[e.civ] : null;
        box.appendChild(U.el('div', { class: 'small', text: `${d.name} · ${d.kind}${civ ? ' of ' + C.fullName(civ) : ''}${e.role ? ' · ' + e.role : ''}` }));
        if (d.desc) box.appendChild(U.el('div', { class: 'small', text: d.desc }));
        box.appendChild(U.el('div', { class: 'bar', html: `<div style="width:${Math.max(0, Math.min(100, (e.hp / e.maxHp) * 100))}%;background:${e.hp / e.maxHp > 0.5 ? '#4caf50' : '#e63946'}"></div>` }));
        const kv = U.el('div', { class: 'kv' });
        const add = (k, v) => kv.appendChild(U.el('div', { html: `<span>${k}</span> <b>${v}</b>` }));
        add('HP', `${Math.ceil(e.hp)} / ${Math.ceil(e.maxHp)}`); add('Damage', e.dmg || 0); add('Age', `${Math.floor(e.age / 20)}s${e.life ? ' / ' + Math.floor(e.life / 20) + 's' : ''}`); add('Speed', (e.speed * 20).toFixed(2) + ' t/s');
        add('Position', `${e.x.toFixed(1)}, ${e.y.toFixed(1)}`); add('State', e.frozen > 0 ? 'frozen' : e.fleeT > 0 ? 'fleeing' : e.hunting ? 'hunting' : e.target ? 'engaged' : e.marching ? 'marching' : e.hasTarget ? 'travelling' : 'idle');
        if (e.scale !== 1) add('Size', `x${e.scale.toFixed(1)}`); if (e.immortal) add('Immortal', 'yes'); if (e.cloudType) add('Cloud', e.cloudType); if (e.r) add('Radius', e.r.toFixed(1));
        box.appendChild(kv);
        const acts = U.el('div', { class: 'actions' });
        acts.appendChild(U.el('button', { class: 'tbtn', text: '🎥 Follow', onclick: () => { g.renderer.follow = e; } }));
        acts.appendChild(U.el('button', { class: 'tbtn good', text: '💚 Heal', onclick: () => { e.hp = e.maxHp; this.renderInspector(); } }));
        acts.appendChild(U.el('button', { class: 'tbtn', text: '👯 Clone', onclick: () => { const n = E.spawn(w, e.type, e.x + 0.5, e.y, { civ: e.civ, role: e.role, home: e.home, force: true }); if (n) { n.scale = e.scale; n.maxHp = e.maxHp; n.hp = e.hp; } } }));
        acts.appendChild(U.el('button', { class: 'tbtn', text: '♾️ Immortal', onclick: () => { e.immortal = !e.immortal; this.renderInspector(); } }));
        acts.appendChild(U.el('button', { class: 'tbtn', text: '🔍 Grow', onclick: () => { e.scale = Math.min(5, e.scale * 1.5); e.maxHp *= 2; e.hp = e.maxHp; } }));
        acts.appendChild(U.el('button', { class: 'tbtn danger', text: '💀 Kill', onclick: () => { E.damage(w, e, 1e9, 'player'); this.closeInspector(); } }));
        acts.appendChild(U.el('button', { class: 'tbtn', text: '✏️ Name', onclick: () => { const n = prompt('Name:', e.name || ''); if (n != null) e.name = n.slice(0, 24); this.renderInspector(); } }));
        box.appendChild(acts);
      } else if (ins.type === 'tile') {
        const x = ins.x, y = ins.y, i = w.idx(x, y), t = w.tiles[i], td = TILES[t];
        const h = U.el('h3', { html: `<span>${esc(td.name)}</span>` }); h.appendChild(closeBtn); box.appendChild(h);
        const kv = U.el('div', { class: 'kv' });
        const add = (k, v) => kv.appendChild(U.el('div', { html: `<span>${k}</span> <b>${v}</b>` }));
        add('Position', `${x}, ${y}`); add('Height', `${w.height[i]} (sea 128)`); add('Moisture', `${Math.round((w.moist[i] / 255) * 100)}%`); add('Temperature', `${Math.round(w.tempAt(x, y) * 100)}%`);
        add('Fertility', `${Math.round(td.fert * 100)}%`); add('Flammable', `${Math.round(td.flam * 100)}%`);
        if (w.fire[i]) add('🔥 Burning', w.fire[i]); if (w.rad[i]) add('☢️ Radiation', w.rad[i]); if (w.poll[i]) add('🏭 Pollution', w.poll[i]);
        const b = w.buildings.get(i); if (b) { const bd = C.BUILDINGS[b.t]; add('Building', `${bd.icon} ${bd.name}`); add('Condition', `${Math.round(b.hp)}/${b.maxHp}${b.prog < 1 ? ` (${Math.round(b.prog * 100)}% built)` : ''}`); }
        const yields = ['food', 'wood', 'stone', 'iron', 'gold', 'science', 'happy'].filter((k) => td[k]).map((k) => `${k} ${td[k]}`).join(', '); if (yields) add('Yields', yields);
        box.appendChild(kv);
        const acts = U.el('div', { class: 'actions' });
        acts.appendChild(U.el('button', { class: 'tbtn', text: '🎯 Pick terrain', onclick: () => { g.pickedTile = t; this.toast(`Picked ${td.name}`); } }));
        acts.appendChild(U.el('button', { class: 'tbtn good', text: '🏕️ Found civ here', onclick: () => { const ab = A.byId.found_civilization; g.useAbilityAt(ab, x + 0.5, y + 0.5, true); } }));
        acts.appendChild(U.el('button', { class: 'tbtn', text: '🪧 Sign', onclick: () => { const s = prompt('Sign text:'); if (s) E.spawn(w, 'sign', x + 0.5, y + 0.5, { name: s.slice(0, 30) }); } }));
        box.appendChild(acts);
      }
    }

    // ---------- log ----------
    renderLog() {
      const w = this.g.world, mc = this.el.modalContent; if (!w) return;
      mc.innerHTML = '';
      const kinds = ['all', 'war', 'peace', 'civ', 'disaster', 'good', 'bad', 'death', 'world', 'player'];
      const tabs = U.el('div', { class: 'tabs' });
      for (const k of kinds) tabs.appendChild(U.el('div', { class: 'tab' + (this.logFilter === k ? ' active' : ''), text: k, onclick: () => { this.logFilter = k; this.renderLog(); } }));
      mc.appendChild(tabs);
      const list = U.el('div', { class: 'log-list' });
      const items = w.log.filter((e) => this.logFilter === 'all' || e.kind === this.logFilter).slice().reverse();
      for (const e of items) { const it = U.el('div', { class: 'log-item ' + e.kind, html: `<span class="t">Y${e.year} D${e.day % 20 + 1}</span>${esc(e.text)}` }); if (e.x != null) it.onclick = () => { this.closePanel(); this.g.renderer.follow = null; this.g.renderer.centerOn(e.x + 0.5, e.y + 0.5); }; list.appendChild(it); }
      if (!items.length) list.appendChild(U.el('div', { class: 'small', text: 'Nothing here yet.' }));
      mc.appendChild(list);
    }

    // ---------- stats ----------
    renderStats() {
      const g = this.g, w = g.world, mc = this.el.modalContent; if (!w) return;
      mc.innerHTML = '';
      let pop = 0, alive = 0, soldiers = 0, buildings = w.buildings.size, maxEra = 0;
      for (const c of w.civs) if (c.alive) { pop += c.pop; alive++; soldiers += c.soldiers; maxEra = Math.max(maxEra, c.era); }
      const animals = w.countEntities((e) => e.kind === 'animal'), monsters = w.countEntities((e) => e.kind === 'monster');
      const grid = U.el('div', { class: 'stat-grid' });
      const tile = (k, v) => grid.appendChild(U.el('div', { class: 'stat-tile', html: `<div class="v">${v}</div><div class="k">${k}</div>` }));
      tile('Year', w.year()); tile('Population', U.fmt(pop)); tile('Civilizations', `${alive} (${w.deadCivs.length} fallen)`); tile('Most advanced era', C.ERAS[maxEra]); tile('Soldiers', soldiers); tile('Buildings', buildings);
      tile('Animals', animals); tile('Monsters', monsters); tile('Fires burning', w.burning.size); tile('Lava tiles', w.lavaSet.size); tile('Global pollution', `${Math.round(w.globalPollution() * 100)}%`); tile('Weather', w.weather.type);
      tile('Abilities used', U.fmt(w.playerStats.uses)); tile('Bombs dropped', U.fmt(w.playerStats.bombs)); tile('Creatures spawned', U.fmt(w.playerStats.spawns)); tile('Kills by you', U.fmt(w.playerStats.kills)); tile('Rain clouds', U.fmt(w.playerStats.rains)); tile('Unique abilities used', Object.keys(w.playerStats.abilities).length + ' / ' + A.list.length);
      mc.appendChild(grid);
      mc.appendChild(U.el('h4', { text: 'Population over time' }));
      const cv = U.el('canvas', { width: 900, height: 220, style: 'width:100%;max-width:900px;background:#000;border:2px solid var(--border)' });
      mc.appendChild(cv);
      this.drawChart(cv, w);
      mc.appendChild(U.el('h4', { text: 'Civilizations by population' }));
      for (const c of w.civs.filter((c) => c.alive).sort((a, b) => b.pop - a.pop)) mc.appendChild(U.el('div', { class: 'rel', html: `<span><span class="swatch" style="background:${c.color}"></span>${esc(C.fullName(c))} · ${C.ERAS[c.era]}</span><span class="minibar" style="width:200px"><div style="width:${Math.min(100, (c.pop / Math.max(1, pop)) * 100)}%;background:${c.color}"></div></span>` }));
      mc.appendChild(U.el('h4', { text: 'Achievements' }));
      const row = U.el('div', { class: 'row' });
      row.appendChild(U.el('button', { class: 'tbtn', text: `🏆 ${Object.keys(g.achievements).length} / ${g.ACHIEVEMENTS.length} unlocked - view`, onclick: () => this.openPanel('achievements') }));
      mc.appendChild(row);
    }
    drawChart(cv, w) {
      const ctx = cv.getContext('2d'); const s = w.stats; const W = cv.width, H = cv.height;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const n = s.pop.length; if (n < 2) { ctx.fillStyle = '#999'; ctx.font = '14px monospace'; ctx.fillText('Not enough history yet (recorded daily).', 20, 40); return; }
      const series = [[s.pop, '#ffd93d', 'population'], [s.animals, '#4caf50', 'animals'], [s.monsters, '#c77dff', 'monsters'], [s.civs.map((v) => v * 10), '#3a86ff', 'civs x10']];
      let max = 1; for (const [arr] of series) for (const v of arr) if (v > max) max = v;
      for (const [arr, col, label] of series) { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < arr.length; i++) { const x = (i / (n - 1)) * (W - 20) + 10, y = H - 20 - (arr[i] / max) * (H - 40); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); }
      ctx.font = '12px monospace'; let lx = 12; for (const [, col, label] of series) { ctx.fillStyle = col; ctx.fillText('■ ' + label, lx, 14); lx += label.length * 8 + 30; }
      ctx.fillStyle = '#999'; ctx.fillText(`max ${U.fmt(max)}`, W - 90, 14); ctx.fillText(`day ${s.days[0]} → ${s.days[n - 1]}`, 12, H - 5);
    }
    renderAchievements() {
      const g = this.g, mc = this.el.modalContent; mc.innerHTML = '';
      mc.appendChild(U.el('div', { class: 'small', text: 'Achievements are saved across all worlds.' }));
      for (const a of g.ACHIEVEMENTS) { const got = g.achievements[a.id]; mc.appendChild(U.el('div', { class: 'ach' + (got ? '' : ' locked'), html: `<span class="ic">${a.icon}</span><div><b>${esc(a.name)}</b><div class="small">${esc(a.desc)}${got ? ' · unlocked ' + new Date(got).toLocaleDateString() : ''}</div></div>` })); }
    }

    // ---------- settings ----------
    renderSettings() {
      const g = this.g, s = g.settings, mc = this.el.modalContent; mc.innerHTML = '';
      const grid = U.el('div', { class: 'form-grid' });
      const check = (key, label, onchange) => { const l = U.el('label'); const cb = U.el('input', { type: 'checkbox' }); cb.checked = !!s[key]; cb.onchange = () => { s[key] = cb.checked; g.saveSettings(); if (onchange) onchange(cb.checked); }; l.appendChild(U.el('span', { text: label })); l.appendChild(cb); grid.appendChild(l); };
      const vol = U.el('label'); vol.appendChild(U.el('span', { text: `Volume` })); const vr = U.el('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s.volume }); vr.oninput = () => { s.volume = +vr.value; MB.audio.setVolume(s.volume); g.saveSettings(); }; vol.appendChild(vr); grid.appendChild(vol);
      check('muted', 'Mute sound (M)', (v) => { MB.audio.muted = v; MB.audio.setVolume(s.volume); });
      check('creative', 'Creative mode (abilities are free)', () => this.refreshHotbar());
      check('particles', 'Particles', (v) => { g.renderer.show.particles = v; });
      check('shake', 'Screen shake');
      check('weatherFx', 'Weather effects overlay', (v) => { g.renderer.show.weather = v; });
      check('showBorders', 'Show borders', (v) => { g.renderer.show.borders = v; g.renderer.invalidateAll(); });
      check('showTerritory', 'Show territory tint', (v) => { g.renderer.show.territory = v; g.renderer.invalidateAll(); });
      check('showNames', 'Show civ names', (v) => { g.renderer.show.names = v; });
      check('eventFeed', 'Event feed on the right');
      check('crt', 'CRT scanlines', (v) => document.body.classList.toggle('crt', v));
      check('bigUI', 'Bigger UI text', (v) => document.body.classList.toggle('big-ui', v));
      check('confirmDangerous', 'Confirm world-ending abilities');
      const auto = U.el('label'); auto.appendChild(U.el('span', { text: 'Autosave interval (seconds, 0 = off)' })); const ai = U.el('input', { type: 'number', min: 0, max: 600, value: s.autosave }); ai.onchange = () => { s.autosave = Math.max(0, +ai.value || 0); g.saveSettings(); }; auto.appendChild(ai); grid.appendChild(auto);
      mc.appendChild(grid);
      mc.appendChild(U.el('h4', { text: 'Data' }));
      const row = U.el('div', { class: 'row' });
      row.appendChild(U.el('span', { class: 'small', text: `Browser storage used by MineBomb: ${(MB.Storage.usage() / 1024).toFixed(0)} KB` }));
      row.appendChild(U.el('button', { class: 'tbtn', text: 'Reset hotbar', onclick: () => { g.hotbar = g.PRESETS.Starter.slice(); g.saveHotbar(); this.refreshHotbar(); } }));
      row.appendChild(U.el('button', { class: 'tbtn danger', text: 'Delete ALL MineBomb data', onclick: () => { if (confirm('Delete every saved world, setting and achievement?')) { const keys = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('minebomb:')) keys.push(k); } keys.forEach((k) => localStorage.removeItem(k)); location.reload(); } } }));
      mc.appendChild(row);
      mc.appendChild(U.el('h4', { text: 'About' }));
      mc.appendChild(U.el('div', { class: 'small', text: `MineBomb is a static web toy: everything runs in your browser and saves to localStorage. ${A.list.length} abilities, ${E.list.length} creature types, ${Object.keys(C.BUILDINGS).length} building types, ${TILES.length} terrain types.` }));
    }

    // ---------- help ----------
    renderHelp() {
      const mc = this.el.modalContent; mc.innerHTML = '';
      mc.appendChild(U.el('div', { html: `<p>You are a god hovering over a pixel world of islands. Tiny civilizations grow from huts to skyscrapers, trade, fight and expand. Help them, torment them, or just watch. Everything saves automatically to your browser.</p>` }));
      const grid = U.el('div', { class: 'help-grid' });
      const rows = [['Left click / drag', 'Use the selected ability (paint abilities repeat while held)'], ['Right drag / Middle drag', 'Pan the camera'], ['Right click (no drag)', 'Inspect what is under the cursor'], ['Shift + click', 'Inspect'], ['Scroll wheel', 'Zoom'], ['Shift + scroll, [ ]', 'Brush size'], ['WASD / Arrows', 'Pan'], ['1-9, 0', 'Select hotbar slot'], ['E', 'Abilities inventory'], ['C', 'Civilizations list'], ['L', 'Chronicle / event log'], ['Space', 'Pause'], ['+ / -', 'Faster / slower'], ['Tab', 'Jump to next capital'], ['F', 'Stop following'], ['G / B / N / O', 'Grid / Borders / Names / Data overlay'], ['M', 'Mute'], ['Ctrl+S', 'Save world'], ['Ctrl+Z', 'Restore snapshot (if you saved one)'], ['P', 'Screenshot'], ['Esc', 'Close panel / world menu'], ['Touch', 'Tap to use, drag to pan, pinch to zoom']];
      for (const [k, v] of rows) { grid.appendChild(U.el('div', { html: `<kbd>${esc(k)}</kbd>` })); grid.appendChild(U.el('div', { text: v })); }
      mc.appendChild(grid);
      mc.appendChild(U.el('h4', { text: 'Tips' }));
      mc.appendChild(U.el('ul', { html: ['Rain clouds make deserts bloom and put out fires. Hold a paint ability to sculpt land.', 'Five wild humans close together will found a new tribe. Campfires attract them.', 'Civilizations advance eras with science: build libraries and schools for them, or just gift science.', 'Wars start between neighbors with bad relations. Cupid, Love Potion and Harmony calm things down. Pariah and Total War do the opposite.', 'Industrial civs pollute. Pollution causes acid rain and global warming (rising seas!). Clean Tech or Carbon Capture fixes it.', 'Nukes leave radiation that mutates animals into monsters. Purify cleans it.', 'Challenge mode (Settings) makes abilities cost divine power. Civs that worship you give you power.', 'Export your world as JSON from the Worlds menu to back it up or share it.', 'Chaos Mode fires random abilities around the world. Good luck.'].map((t) => `<li>${t}</li>`).join('') }));
    }

    // ---------- worlds ----------
    renderWorlds() {
      const g = this.g, mc = this.el.modalContent; mc.innerHTML = '';
      const start = !g.world;
      if (start) { mc.appendChild(U.el('div', { class: 'title', text: '💣 MineBomb' })); mc.appendChild(U.el('div', { class: 'subtitle', text: `A pixel god sandbox. ${A.list.length} abilities. Infinite ways to ruin (or save) a tiny world.` })); }
      const cols = U.el('div', { class: 'cols' });
      // left: saved worlds
      const left = U.el('div');
      left.appendChild(U.el('h4', { text: 'Your worlds' }));
      const list = MB.Storage.listWorlds();
      if (g.world) { const cur = U.el('div', { class: 'world-card' }); cur.appendChild(U.el('div', { html: `<div class="nm">▶ ${esc(g.world.name)} (current)</div><div class="info">${g.world.w}×${g.world.h} · Year ${g.world.year()}</div>` })); const acts = U.el('div', { class: 'actions' }); acts.appendChild(U.el('button', { class: 'tbtn good', text: 'Continue', onclick: () => this.closePanel() })); acts.appendChild(U.el('button', { class: 'tbtn', text: '💾 Save', onclick: () => { g.saveWorld(true); this.renderWorlds(); } })); acts.appendChild(U.el('button', { class: 'tbtn', text: '📤 Export JSON', onclick: () => g.exportWorld() })); acts.appendChild(U.el('button', { class: 'tbtn', text: '✏️ Rename', onclick: () => { const n = prompt('World name:', g.world.name); if (n) { g.world.name = n.slice(0, 40); g.saveWorld(true); this.renderWorlds(); } } })); cur.appendChild(acts); left.appendChild(cur); }
      if (!list.length) left.appendChild(U.el('div', { class: 'small', text: 'No saved worlds yet. Create one on the right!' }));
      for (const wi of list) {
        if (g.world && wi.id === g.world.id) continue;
        const card = U.el('div', { class: 'world-card' });
        card.appendChild(U.el('div', { html: `<div class="nm">${esc(wi.name)}</div><div class="info">${esc(wi.size || '')} · Year ${wi.year || 1} · pop ${U.fmt(wi.pop || 0)} · ${wi.civs || 0} civs · ${((wi.bytes || 0) / 1024).toFixed(0)} KB · saved ${new Date(wi.updated).toLocaleString()}</div>` }));
        const acts = U.el('div', { class: 'actions' });
        acts.appendChild(U.el('button', { class: 'tbtn good', text: '▶ Play', onclick: () => { g.loadWorld(wi.id); } }));
        acts.appendChild(U.el('button', { class: 'tbtn', text: '📤 Export', onclick: () => { const wd = MB.Storage.loadWorld(wi.id); if (wd) MB.Storage.exportWorld(wd); } }));
        acts.appendChild(U.el('button', { class: 'tbtn', text: '📑 Duplicate', onclick: () => { MB.Storage.duplicateWorld(wi.id); this.renderWorlds(); } }));
        acts.appendChild(U.el('button', { class: 'tbtn', text: '✏️', title: 'Rename', onclick: () => { const n = prompt('World name:', wi.name); if (n) { MB.Storage.renameWorld(wi.id, n.slice(0, 40)); this.renderWorlds(); } } }));
        acts.appendChild(U.el('button', { class: 'tbtn danger', text: '🗑️', title: 'Delete', onclick: () => { if (confirm(`Delete world "${wi.name}" forever?`)) { MB.Storage.deleteWorld(wi.id); this.renderWorlds(); } } }));
        card.appendChild(acts);
        left.appendChild(card);
      }
      const imp = U.el('div', { class: 'row' });
      imp.appendChild(U.el('button', { class: 'tbtn', text: '📥 Import world JSON', onclick: () => $('import-file').click() }));
      imp.appendChild(U.el('span', { class: 'small', text: `Storage used: ${(MB.Storage.usage() / 1024).toFixed(0)} KB (browsers allow ~5 MB)` }));
      left.appendChild(imp);
      // right: new world
      const right = U.el('div');
      right.appendChild(U.el('h4', { text: 'New world' }));
      const f = U.el('div', { class: 'form-grid' });
      const field = (label, input) => { const l = U.el('label'); l.appendChild(U.el('span', { text: label })); l.appendChild(input); f.appendChild(l); return input; };
      const name = field('Name', U.el('input', { type: 'text', value: U.civName() + ' ' + U.pick(['Isles', 'Archipelago', 'World', 'Realm', 'Sea', 'Expanse']), maxlength: 40 }));
      const seed = field('Seed (blank = random)', U.el('input', { type: 'text', placeholder: 'any text or number' }));
      const size = field('Size', U.el('select', { html: Object.entries(MB.World.SIZES).map(([k, v]) => `<option value="${k}" ${k === 'medium' ? 'selected' : ''}>${k} (${v[0]}×${v[1]})</option>`).join('') }));
      const shape = field('Shape', U.el('select', { html: ['earth', 'continents', 'archipelago', 'pangea', 'ring'].map((k) => `<option value="${k}">${k}</option>`).join('') }));
      const land = field('Land amount', U.el('input', { type: 'range', min: 0.15, max: 0.75, step: 0.05, value: 0.4 }));
      const climate = field('Climate', U.el('select', { html: ['temperate', 'hot', 'cold', 'tropical', 'frozen'].map((k) => `<option value="${k}">${k}</option>`).join('') }));
      const civs = field('Starting tribes', U.el('input', { type: 'number', min: 0, max: 20, value: 6 }));
      const maxCivs = field('Max civilizations', U.el('input', { type: 'number', min: 1, max: 40, value: 12 }));
      const animals = field('Wildlife density', U.el('input', { type: 'range', min: 0, max: 3, step: 0.25, value: 1 }));
      const disasters = field('Natural disasters', U.el('input', { type: 'range', min: 0, max: 3, step: 0.25, value: 1 }));
      right.appendChild(f);
      const row = U.el('div', { class: 'row' });
      row.appendChild(U.el('button', { class: 'tbtn good', text: '🌍 Create world', style: 'font-size:15px;padding:8px 16px', onclick: () => { g.newWorld({ name: name.value.trim() || 'New World', seed: seed.value.trim(), size: size.value, shape: shape.value, land: +land.value, climate: climate.value, civs: +civs.value, maxCivs: +maxCivs.value, animals: +animals.value, disasters: +disasters.value }); } }));
      row.appendChild(U.el('button', { class: 'tbtn', text: '🎲 Surprise me', onclick: () => { g.newWorld({ name: U.civName() + ' ' + U.pick(['Isles', 'World', 'Realm']), size: U.pick(['small', 'medium', 'medium', 'large']), shape: U.pick(['earth', 'continents', 'archipelago', 'earth']), land: U.rfloat(0.3, 0.5), climate: U.pick(['temperate', 'temperate', 'hot', 'cold', 'tropical']), civs: U.rint(4, 9), maxCivs: 12, animals: 1, disasters: 1 }); } }));
      right.appendChild(row);
      right.appendChild(U.el('div', { class: 'small', text: 'Big worlds (huge/colossal) need a faster computer. Medium is a good start.' }));
      cols.appendChild(left); cols.appendChild(right);
      mc.appendChild(cols);
      if (start) { mc.appendChild(U.el('h4', { text: 'How to play' })); mc.appendChild(U.el('div', { class: 'small', html: 'Pick an ability from the hotbar (1-0) or inventory (E). Left-click the world to use it. Right-drag to pan, scroll to zoom. Civilizations grow on their own: watch them, feed them, bomb them. <b>Everything autosaves.</b>' })); }
    }
  }

  MB.UI = UI;
})();
