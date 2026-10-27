'use strict';
// MineBomb - localStorage persistence: worlds index, saves, settings, achievements, JSON import/export
(function () {
  const U = MB.util;
  const KEY_INDEX = 'minebomb:worlds';
  const KEY_WORLD = 'minebomb:world:';
  const KEY_SETTINGS = 'minebomb:settings';
  const KEY_ACH = 'minebomb:achievements';
  const KEY_HOTBAR = 'minebomb:hotbar';
  const KEY_META = 'minebomb:meta';
  const S = {};

  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { console.warn('storage full?', e); return false; } }
  function safeDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }

  S.listWorlds = () => { try { return JSON.parse(safeGet(KEY_INDEX) || '[]'); } catch (e) { return []; } };
  S.saveIndex = (list) => safeSet(KEY_INDEX, JSON.stringify(list));
  S.saveWorld = (world) => {
    const data = world.serialize();
    const json = JSON.stringify(data);
    const ok = safeSet(KEY_WORLD + world.id, json);
    if (!ok) return { ok: false, size: json.length };
    const list = S.listWorlds().filter((w) => w.id !== world.id);
    let pop = 0, civs = 0;
    for (const c of world.civs) if (c.alive) { pop += c.pop; civs++; }
    list.unshift({ id: world.id, name: world.name, size: `${world.w}x${world.h}`, year: world.year(), day: world.day(), pop: Math.round(pop), civs, updated: Date.now(), created: world.created, bytes: json.length, tick: world.tick });
    S.saveIndex(list);
    return { ok: true, size: json.length };
  };
  S.loadWorldData = (id) => { const raw = safeGet(KEY_WORLD + id); if (!raw) return null; try { return JSON.parse(raw); } catch (e) { return null; } };
  S.loadWorld = (id) => { const d = S.loadWorldData(id); if (!d) return null; try { return MB.World.deserialize(d); } catch (e) { console.error('load failed', e); return null; } };
  S.deleteWorld = (id) => { safeDel(KEY_WORLD + id); S.saveIndex(S.listWorlds().filter((w) => w.id !== id)); };
  S.renameWorld = (id, name) => { const d = S.loadWorldData(id); if (d) { d.name = name; safeSet(KEY_WORLD + id, JSON.stringify(d)); } const list = S.listWorlds(); for (const w of list) if (w.id === id) w.name = name; S.saveIndex(list); };
  S.duplicateWorld = (id) => { const d = S.loadWorldData(id); if (!d) return null; d.id = U.uid(); d.name = d.name + ' (copy)'; d.created = Date.now(); safeSet(KEY_WORLD + d.id, JSON.stringify(d)); const list = S.listWorlds(); const src = list.find((w) => w.id === id); list.unshift(Object.assign({}, src || {}, { id: d.id, name: d.name, updated: Date.now(), created: d.created })); S.saveIndex(list); return d.id; };
  S.exportWorld = (world) => { const data = world.serialize(); data.exportedAt = new Date().toISOString(); data.game = 'MineBomb'; const json = JSON.stringify(data); U.downloadText(`${(world.name || 'world').replace(/[^a-z0-9_-]+/gi, '_')}_Y${world.year()}.minebomb.json`, json); return json.length; };
  S.importWorldJSON = (text) => {
    let d;
    try { d = JSON.parse(text); } catch (e) { throw new Error('Invalid JSON file.'); }
    if (!d || !d.layers || !d.layers.tiles || !d.w || !d.h) throw new Error('This file is not a MineBomb world.');
    if (d.v > MB.World.SAVE_VERSION) throw new Error('World was saved by a newer version of MineBomb.');
    d.id = U.uid();
    d.imported = Date.now();
    const world = MB.World.deserialize(d);
    return world;
  };
  S.usage = () => { let total = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('minebomb:')) total += (localStorage.getItem(k) || '').length; } } catch (e) { /* ignore */ } return total; };

  S.loadSettings = () => { try { return Object.assign({}, S.defaultSettings(), JSON.parse(safeGet(KEY_SETTINGS) || '{}')); } catch (e) { return S.defaultSettings(); } };
  S.saveSettings = (s) => safeSet(KEY_SETTINGS, JSON.stringify(s));
  S.defaultSettings = () => ({ volume: 0.5, muted: false, particles: true, shake: true, autosave: 30, creative: true, showBorders: true, showNames: true, showTerritory: true, weatherFx: true, confirmDangerous: false, crt: false, tooltips: true, bigUI: false, eventFeed: true, music: true });
  S.loadAchievements = () => { try { return JSON.parse(safeGet(KEY_ACH) || '{}'); } catch (e) { return {}; } };
  S.saveAchievements = (a) => safeSet(KEY_ACH, JSON.stringify(a));
  S.loadHotbar = () => { try { return JSON.parse(safeGet(KEY_HOTBAR) || 'null'); } catch (e) { return null; } };
  S.saveHotbar = (h) => safeSet(KEY_HOTBAR, JSON.stringify(h));
  S.loadMeta = () => { try { return JSON.parse(safeGet(KEY_META) || '{}'); } catch (e) { return {}; } };
  S.saveMeta = (m) => safeSet(KEY_META, JSON.stringify(m));

  MB.Storage = S;
})();
