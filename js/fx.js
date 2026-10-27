'use strict';
// MineBomb - particles & visual effects (world-space particles, screen flash/shake)
(function () {
  const U = MB.util;
  const P = { list: [], max: 6000, state: { flash: 0, flashColor: '#fff', shake: 0 }, time: 0 };

  function add(p) {
    if (P.list.length >= P.max) { if (Math.random() < 0.7) return null; P.list[(Math.random() * P.list.length) | 0] = p; return p; }
    p.age = 0;
    if (p.life == null) p.life = 30;
    if (p.vx == null) p.vx = 0;
    if (p.vy == null) p.vy = 0;
    if (p.size == null) p.size = 0.15;
    if (p.type == null) p.type = 'rect';
    P.list.push(p);
    return p;
  }
  function update(dtTicks) {
    const list = P.list;
    let j = 0;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      p.age += dtTicks;
      if (!(p.age < p.life) || !isFinite(p.x) || !isFinite(p.y)) continue;
      p.x += p.vx * dtTicks; p.y += p.vy * dtTicks;
      if (p.grav) p.vy += 0.004 * dtTicks * p.grav;
      if (p.drag) { p.vx *= Math.pow(p.drag, dtTicks); p.vy *= Math.pow(p.drag, dtTicks); }
      if (p.type === 'ring') p.r += p.dr * dtTicks;
      if (p.spin) p.ang = (p.ang || 0) + p.spin * dtTicks;
      list[j++] = p;
    }
    list.length = j;
    P.state.flash = Math.max(0, P.state.flash - 0.04 * dtTicks);
    P.state.shake = Math.max(0, P.state.shake - 0.5 * dtTicks);
    P.time += dtTicks;
  }

  const fx = {};
  fx.flash = (a, color) => { P.state.flash = Math.max(P.state.flash, a); P.state.flashColor = color || '#fff'; };
  fx.shake = (a) => { P.state.shake = Math.min(30, Math.max(P.state.shake, a)); };
  fx.blood = (x, y, color) => { for (let k = 0; k < 6; k++) add({ x, y, vx: U.rfloat(-0.08, 0.08), vy: U.rfloat(-0.1, 0.02), life: U.rint(15, 35), size: 0.12, color: color || '#c1121f', grav: 1 }); };
  fx.puff = (x, y, color, n = 6) => { for (let k = 0; k < n; k++) add({ x, y, vx: U.rfloat(-0.06, 0.06), vy: U.rfloat(-0.06, 0.02), life: U.rint(20, 45), size: U.rfloat(0.15, 0.35), color, fade: true }); };
  fx.sparkle = (x, y, color, n = 5) => { for (let k = 0; k < n; k++) add({ x: x + U.rfloat(-0.4, 0.4), y: y + U.rfloat(-0.4, 0.4), vx: U.rfloat(-0.03, 0.03), vy: U.rfloat(-0.06, -0.01), life: U.rint(20, 50), size: 0.12, color: color || '#ffd700', twinkle: true }); };
  fx.smoke = (x, y, n = 3) => { for (let k = 0; k < n; k++) add({ x: x + U.rfloat(-0.3, 0.3), y, vx: U.rfloat(-0.01, 0.01), vy: U.rfloat(-0.05, -0.02), life: U.rint(50, 110), size: U.rfloat(0.3, 0.6), color: U.pick(['#555', '#666', '#444', '#777']), fade: true, grow: 0.005 }); };
  fx.ember = (x, y) => add({ x, y, vx: U.rfloat(-0.02, 0.02), vy: U.rfloat(-0.08, -0.03), life: U.rint(15, 40), size: 0.1, color: U.pick(['#ff8c00', '#ffd93d', '#ff3b00']), fade: true });
  fx.steam = (x, y) => { for (let k = 0; k < 3; k++) add({ x: x + U.rfloat(-0.3, 0.3), y, vx: U.rfloat(-0.02, 0.02), vy: U.rfloat(-0.07, -0.03), life: U.rint(30, 60), size: 0.3, color: '#dfe', fade: true, grow: 0.006 }); };
  fx.spark = (x, y) => add({ x, y, vx: U.rfloat(-0.04, 0.04), vy: U.rfloat(-0.08, -0.02), life: U.rint(6, 14), size: 0.1, color: '#ffd93d' });
  fx.hit = (x, y) => { for (let k = 0; k < 4; k++) add({ x, y, vx: U.rfloat(-0.1, 0.1), vy: U.rfloat(-0.1, 0.1), life: U.rint(6, 12), size: 0.1, color: '#fff' }); };
  fx.shot = (x1, y1, x2, y2, kind) => add({ type: 'line', x: x1, y: y1, x2, y2, life: 4, color: kind === 'laser' ? '#ff3b3b' : '#ddd', width: 1 });
  fx.beam = (x1, y1, x2, y2, color) => { add({ type: 'line', x: x1, y: y1, x2, y2, life: 14, color: color || '#9fff5f', width: 3, fade: true }); fx.sparkle(x2, y2, color, 6); };
  fx.lightning = (x, y) => {
    const pts = [];
    let px = x + 0.5, py = y - 18;
    pts.push([px, py]);
    while (py < y + 0.5) { py += U.rfloat(1.5, 3); px += U.rfloat(-1.2, 1.2); pts.push([px, py]); }
    pts[pts.length - 1] = [x + 0.5, y + 0.5];
    add({ type: 'poly', pts, x, y, life: 9, color: '#fff', width: 2, glow: '#a0e9ff' });
    add({ type: 'glow', x: x + 0.5, y: y + 0.5, r: 2.5, life: 10, color: '#a0e9ff', fade: true });
    fx.flash(0.25, '#dff6ff');
    fx.sparkle(x + 0.5, y + 0.5, '#fff', 8);
    if (MB.audio) MB.audio.play('thunder');
  };
  fx.ring = (x, y, r, color, life = 20, width = 2) => add({ type: 'ring', x, y, r: 0.2, dr: r / life, life, color, width, fade: true });
  fx.explosion = (x, y, r, color) => {
    add({ type: 'glow', x, y, r: r * 1.1, life: 12 + r * 2, color: color || '#ffb347', fade: true });
    fx.ring(x, y, r * 1.5, '#fff', 14 + r, 2);
    const n = Math.min(60, 10 + r * 8);
    for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, s = U.rfloat(0.05, 0.25) * (0.5 + r * 0.3); add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.1, life: U.rint(15, 40), size: U.rfloat(0.1, 0.25), color: U.pick(['#ff8c00', '#ffd93d', '#ff3b00', '#333', '#777']), grav: 1, drag: 0.95 }); }
    for (let k = 0; k < Math.min(40, 4 + r * 4); k++) add({ x: x + U.rfloat(-r * 0.5, r * 0.5), y: y + U.rfloat(-r * 0.5, r * 0.5), vx: U.rfloat(-0.02, 0.02), vy: U.rfloat(-0.06, -0.02), life: U.rint(40, 120), size: U.rfloat(0.3, 0.8), color: U.pick(['#444', '#555', '#333', '#666']), fade: true, grow: 0.006 });
    fx.shake(Math.min(25, r * 2.5));
    fx.flash(Math.min(0.5, r * 0.06), '#ffe8c0');
    if (MB.audio) MB.audio.play(r > 6 ? 'bigboom' : 'boom');
  };
  fx.mushroomCloud = (x, y, r) => {
    for (let k = 0; k < 90; k++) {
      const t = k / 90;
      add({ x: x + U.rfloat(-0.6, 0.6), y: y - t * 2, vx: U.rfloat(-0.005, 0.005), vy: -0.06 - t * 0.03, life: U.rint(140, 260), size: U.rfloat(0.5, 1.1), color: U.pick(['#777', '#999', '#555', '#b58a5a', '#ddd']), fade: true, grow: 0.01, mush: { ox: x, top: y - r * 2.2, spread: r * 1.3 } });
    }
    add({ type: 'glow', x, y, r: r * 1.6, life: 60, color: '#fff2a0', fade: true });
    fx.ring(x, y, r * 2.5, '#fff', 40, 4);
    fx.ring(x, y, r * 4, '#ffd27f', 70, 2);
    fx.flash(1, '#ffffff');
    fx.shake(30);
    if (MB.audio) MB.audio.play('nuke');
  };
  fx.text = (x, y, str, color) => add({ type: 'text', x, y, vy: -0.03, life: 60, text: str, color: color || '#fff', fade: true });
  fx.trail = (x, y, color) => add({ x, y, vx: U.rfloat(-0.01, 0.01), vy: U.rfloat(-0.01, 0.01), life: U.rint(8, 18), size: 0.15, color, fade: true });
  fx.tornadoFx = (e, r) => {
    if (Math.random() < 0.6) return;
    const a = Math.random() * Math.PI * 2, d = U.rfloat(0.2, r);
    add({ x: e.x + Math.cos(a) * d, y: e.y + Math.sin(a) * d, vx: -Math.sin(a) * 0.15, vy: Math.cos(a) * 0.15 - 0.05, life: U.rint(10, 25), size: U.rfloat(0.1, 0.25), color: e.def.fire ? U.pick(['#ff8c00', '#ff3b00', '#555']) : U.pick(['#8a8a8a', '#aaa', '#777', '#6b4f2e']), fade: true });
  };
  const CLOUD_COLORS = { rain: '#8fb8ff', monsoon: '#6fa0ff', storm: '#7fa0dd', snow: '#ffffff', acid: '#9fff5f', blood: '#c1121f', fish: '#3a86ff', frog: '#4caf50', candy: '#ff9ecf', gold: '#ffd700', lava: '#ff5a1f', meteor: '#ff8c00', locust: '#9acd32', pollen: '#ffe56f', fertile: '#7fff7f', ash: '#777', fallout: '#9fff9f', heal: '#7fffd4', poison: '#7b2cbf', confetti: '#ff00aa', cow: '#fff', money: '#80b918', freeze: '#a0e9ff', void: '#2a0a3a', rainbow: '#ff5f5f', pizza: '#ff6b35' };
  fx.cloudFx = (e, r, type) => {
    const n = Math.min(6, Math.max(1, Math.round(r * r * 0.05)));
    const col = CLOUD_COLORS[type] || '#8fb8ff';
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r;
      const x = e.x + Math.cos(a) * d, y = e.y + Math.sin(a) * d;
      if (type === 'snow' || type === 'ash' || type === 'pollen' || type === 'confetti' || type === 'fallout') add({ x, y: y - 1.5, vx: U.rfloat(-0.01, 0.01), vy: 0.03, life: 50, size: 0.12, color: type === 'confetti' ? U.hslToHex(Math.random() * 360, 1, 0.6) : col, fade: true });
      else if (type === 'rainbow') add({ x, y: y - 1.5, vx: 0, vy: 0.06, life: 30, size: 0.1, color: U.hslToHex((P.time * 10 + k * 60) % 360, 1, 0.6) });
      else add({ type: 'drop', x, y: y - 2, vx: 0, vy: 0.25, life: 10, size: 0.12, color: col });
    }
  };
  fx.blackholeFx = (e, r) => {
    const a = Math.random() * Math.PI * 2, d = r * U.rfloat(1.5, 4);
    const x = e.x + Math.cos(a) * d, y = e.y + Math.sin(a) * d;
    add({ x, y, vx: (e.x - x) * 0.04 - Math.sin(a) * 0.08, vy: (e.y - y) * 0.04 + Math.cos(a) * 0.08, life: 25, size: 0.12, color: U.pick(['#c77dff', '#7b2cbf', '#fff', '#ff00aa']), fade: true });
  };
  fx.shieldFx = (e, r) => { if (Math.random() < 0.15) { const a = Math.random() * Math.PI * 2; add({ x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r, life: 20, size: 0.12, color: '#a0e9ff', fade: true }); } };
  fx.splash = (x, y, n = 6) => { for (let k = 0; k < n * 3; k++) add({ x, y, vx: U.rfloat(-0.12, 0.12), vy: U.rfloat(-0.2, -0.05), life: U.rint(10, 25), size: 0.12, color: U.pick(['#9fd3ff', '#fff', '#3a86ff']), grav: 1 }); };
  fx.hearts = (x, y, n = 8) => { for (let k = 0; k < n; k++) add({ type: 'text', x: x + U.rfloat(-1, 1), y: y + U.rfloat(-0.5, 0.5), vy: -0.03, life: 50, text: '♥', color: '#ff4d8d', fade: true }); };
  fx.fireworkBurst = (x, y, color) => { for (let k = 0; k < 40; k++) { const a = Math.random() * Math.PI * 2, s = U.rfloat(0.05, 0.18); add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: U.rint(20, 45), size: 0.12, color: Math.random() < 0.7 ? color : '#fff', grav: 0.5, drag: 0.96, twinkle: true }); } add({ type: 'glow', x, y, r: 1.5, life: 10, color, fade: true }); if (MB.audio) MB.audio.play('pop'); };
  fx.confetti = (x, y, n = 30) => { for (let k = 0; k < n; k++) add({ x: x + U.rfloat(-2, 2), y: y + U.rfloat(-2, 2), vx: U.rfloat(-0.05, 0.05), vy: U.rfloat(-0.1, 0), life: U.rint(40, 80), size: 0.12, color: U.hslToHex(Math.random() * 360, 1, 0.6), grav: 0.3, drag: 0.98, spin: 0.2 }); };
  fx.roar = (x, y) => { fx.ring(x, y, 12, '#fff', 30, 3); fx.shake(10); if (MB.audio) MB.audio.play('roar'); };
  fx.breath = (x, y, type) => { const col = type === 'fire' ? ['#ff8c00', '#ff3b00', '#ffd93d'] : type === 'ice' ? ['#a0e9ff', '#fff', '#3a86ff'] : ['#7b2cbf', '#000', '#ff00aa']; for (let k = 0; k < 20; k++) add({ x: x + U.rfloat(-0.5, 0.5), y: y + U.rfloat(-0.5, 0.5), vx: U.rfloat(-0.1, 0.1), vy: U.rfloat(-0.05, 0.12), life: U.rint(10, 25), size: U.rfloat(0.15, 0.35), color: U.pick(col), fade: true }); if (MB.audio) MB.audio.play('fire'); };
  fx.magic = (x, y, r, color) => { fx.ring(x, y, r, color || '#c77dff', 20, 2); fx.sparkle(x, y, color || '#c77dff', 12); if (MB.audio) MB.audio.play('magic'); };
  fx.holy = (x, y, r) => { add({ type: 'glow', x, y, r, life: 30, color: '#fff3b0', fade: true }); fx.sparkle(x, y, '#fff', 15); fx.ring(x, y, r, '#ffd700', 25, 2); if (MB.audio) MB.audio.play('holy'); };
  fx.evil = (x, y, r) => { add({ type: 'glow', x, y, r, life: 30, color: '#3e1255', fade: true }); fx.puff(x, y, '#7b2cbf', 15); fx.ring(x, y, r, '#7b2cbf', 25, 2); if (MB.audio) MB.audio.play('evil'); };
  fx.glowAt = (x, y, r, color, life = 20) => add({ type: 'glow', x, y, r, life, color, fade: true });
  fx.debris = (x, y, n, color) => { for (let k = 0; k < n; k++) add({ x, y, vx: U.rfloat(-0.15, 0.15), vy: U.rfloat(-0.2, -0.05), life: U.rint(15, 35), size: 0.12, color: color || '#8d8f72', grav: 1 }); };
  fx.wave = (x, y, dirx, diry, len) => { for (let k = 0; k < len * 4; k++) add({ x: x + U.rfloat(-len, len) * Math.abs(diry) + U.rfloat(-0.5, 0.5), y: y + U.rfloat(-len, len) * Math.abs(dirx) + U.rfloat(-0.5, 0.5), vx: dirx * 0.2, vy: diry * 0.2, life: 25, size: 0.25, color: U.pick(['#9fd3ff', '#fff', '#3a86ff']), fade: true }); };
  fx.leaf = (x, y) => add({ x, y, vx: U.rfloat(-0.03, 0.03), vy: U.rfloat(-0.04, 0), life: 40, size: 0.12, color: U.pick(['#4caf50', '#9acd32', '#ff9ecf']), fade: true });

  P.add = add; P.update = update;
  MB.Particles = P;
  MB.fx = fx;
})();
