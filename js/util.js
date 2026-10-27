'use strict';
// MineBomb - utilities: RNG, noise, hashing, names, colors, encoding
window.MB = window.MB || {};
(function () {
  const U = {};

  // ---------- Seeded RNG (mulberry32) ----------
  U.RNG = class RNG {
    constructor(seed) {
      this.s = (seed >>> 0) || 0x9E3779B9;
    }
    next() {
      let t = (this.s += 0x6D2B79F5) | 0;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    float(a = 0, b = 1) { return a + (b - a) * this.next(); }
    int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
    chance(p) { return this.next() < p; }
    gauss() {
      let u = 0, v = 0;
      while (u === 0) u = this.next();
      while (v === 0) v = this.next();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }
  };

  // Fast gameplay randomness (not seeded on purpose)
  U.rand = Math.random;
  U.rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  U.rfloat = (a, b) => a + Math.random() * (b - a);
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;
  U.gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  };
  U.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };

  // ---------- Hashing ----------
  U.hash2 = (x, y, s = 0) => {
    let h = (x * 374761393 + y * 668265263 + s * 1013904223) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967296;
  };
  U.hashStr = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  // ---------- Simplex noise ----------
  const GRAD = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  U.Simplex = class Simplex {
    constructor(rng) {
      const perm = [];
      for (let i = 0; i < 256; i++) perm[i] = i;
      rng.shuffle(perm);
      this.p = new Uint8Array(512);
      for (let i = 0; i < 512; i++) this.p[i] = perm[i & 255];
    }
    noise2(xin, yin) {
      const p = this.p;
      let n0, n1, n2;
      const s = (xin + yin) * F2;
      const i = Math.floor(xin + s), j = Math.floor(yin + s);
      const t = (i + j) * G2;
      const x0 = xin - (i - t), y0 = yin - (j - t);
      let i1, j1;
      if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
      const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
      const ii = i & 255, jj = j & 255;
      const gi0 = p[ii + p[jj]] & 7, gi1 = p[ii + i1 + p[jj + j1]] & 7, gi2 = p[ii + 1 + p[jj + 1]] & 7;
      let t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 < 0) n0 = 0; else { t0 *= t0; n0 = t0 * t0 * (GRAD[gi0][0] * x0 + GRAD[gi0][1] * y0); }
      let t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 < 0) n1 = 0; else { t1 *= t1; n1 = t1 * t1 * (GRAD[gi1][0] * x1 + GRAD[gi1][1] * y1); }
      let t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 < 0) n2 = 0; else { t2 *= t2; n2 = t2 * t2 * (GRAD[gi2][0] * x2 + GRAD[gi2][1] * y2); }
      return 70 * (n0 + n1 + n2);
    }
    fbm(x, y, oct = 4, lac = 2, gain = 0.5) {
      let a = 1, f = 1, sum = 0, norm = 0;
      for (let o = 0; o < oct; o++) {
        sum += a * this.noise2(x * f, y * f);
        norm += a;
        a *= gain; f *= lac;
      }
      return sum / norm;
    }
  };

  // ---------- Math ----------
  U.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  U.dist2 = (x1, y1, x2, y2) => (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  U.smoothstep = (t) => t * t * (3 - 2 * t);
  U.sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);

  // ---------- IDs ----------
  let idc = 0;
  U.uid = () => (Date.now().toString(36) + (idc++).toString(36) + Math.floor(Math.random() * 1e6).toString(36));

  // ---------- Formatting ----------
  U.fmt = (n) => {
    n = Math.round(n);
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e4) return (n / 1e3).toFixed(1) + 'k';
    return String(n);
  };
  U.pad2 = (n) => (n < 10 ? '0' : '') + n;
  const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  U.roman = (n) => {
    let s = '';
    for (const [v, r] of ROMAN) while (n >= v) { s += r; n -= v; }
    return s || 'I';
  };
  U.escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Colors ----------
  U.hslToRgb = (h, s, l) => {
    h = ((h % 360) + 360) % 360; s = U.clamp(s, 0, 1); l = U.clamp(l, 0, 1);
    const c = (1 - Math.abs(2 * l - 1)) * s, hp = h / 60, x = c * (1 - Math.abs((hp % 2) - 1));
    let r = 0, g = 0, b = 0;
    if (hp < 1) { r = c; g = x; } else if (hp < 2) { r = x; g = c; } else if (hp < 3) { g = c; b = x; }
    else if (hp < 4) { g = x; b = c; } else if (hp < 5) { r = x; b = c; } else { r = c; b = x; }
    const m = l - c / 2;
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  };
  U.rgbToHex = (r, g, b) => '#' + [r, g, b].map((v) => U.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  U.hslToHex = (h, s, l) => { const [r, g, b] = U.hslToRgb(h, s, l); return U.rgbToHex(r, g, b); };
  U.hexToRgb = (hex) => {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.shade = (hex, amt) => {
    const [r, g, b] = U.hexToRgb(hex);
    return U.rgbToHex(r + amt, g + amt, b + amt);
  };
  U.mix = (hexA, hexB, t) => {
    const a = U.hexToRgb(hexA), b = U.hexToRgb(hexB);
    return U.rgbToHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  };
  U.rgba = (hex, a) => { const [r, g, b] = U.hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };

  // ---------- RLE encoding for typed arrays ----------
  U.rleEncode = (arr) => {
    const out = [];
    let i = 0;
    const n = arr.length;
    while (i < n) {
      const v = arr[i];
      let run = 1;
      while (i + run < n && arr[i + run] === v && run < 1e9) run++;
      out.push(v, run);
      i += run;
    }
    return out;
  };
  U.rleDecode = (rle, len, Type) => {
    const arr = new Type(len);
    let p = 0;
    for (let i = 0; i < rle.length; i += 2) {
      const v = rle[i], run = rle[i + 1];
      arr.fill(v, p, Math.min(len, p + run));
      p += run;
    }
    return arr;
  };

  // ---------- Names ----------
  const SYL1 = ['Va', 'Ko', 'Ar', 'El', 'Mor', 'Thal', 'Zen', 'Ori', 'Bel', 'Dra', 'Kor', 'Lu', 'Sil', 'Tor', 'Ash', 'Ven', 'Ny', 'Ga', 'Hel', 'Ith', 'Jor', 'Kal', 'Mar', 'Nor', 'Os', 'Pel', 'Quor', 'Ra', 'Sor', 'Tal', 'Ul', 'Vor', 'Wyn', 'Xan', 'Yor', 'Zal', 'Fen', 'Gal', 'Hal', 'Ish', 'Bra', 'Cal', 'Dun', 'Eri', 'Fal', 'Gri', 'Hol', 'Ina', 'Jun', 'Kes', 'Lor', 'Mel', 'Nar', 'Oku', 'Pra', 'Rho', 'Ser', 'Tir', 'Uma', 'Vel'];
  const SYL2 = ['an', 'en', 'or', 'ar', 'il', 'on', 'um', 'is', 'a', 'e', 'o', 'ia', 'ae', 'us', 'eth', 'oth', 'ir', 'ur', 'ad', 'ek', 'ash', 'ov', 'im', 'ol'];
  const SUFFIX = ['ia', 'land', 'mark', 'stan', 'heim', 'gard', 'dor', 'onia', 'aria', 'burg', 'wick', 'shire', 'moor', 'vale', 'haven', 'reach', 'holm', 'mere', 'os', 'ium', 'ica', 'esse', 'ora', 'ath'];
  U.civName = (rng) => {
    const r = rng || { pick: U.pick, chance: U.chance };
    let n = r.pick(SYL1);
    if (r.chance(0.5)) n += r.pick(SYL2);
    n += r.pick(SUFFIX);
    return n;
  };
  const FIRST = ['Ada', 'Bram', 'Cora', 'Dax', 'Elin', 'Finn', 'Gwen', 'Hugo', 'Ines', 'Jax', 'Kira', 'Loan', 'Mira', 'Nico', 'Orla', 'Pim', 'Quinn', 'Rune', 'Sage', 'Tove', 'Uma', 'Vale', 'Wren', 'Xavi', 'Yara', 'Zed', 'Alder', 'Brina', 'Cassius', 'Dorian', 'Elara', 'Fenwick', 'Galen', 'Hesper', 'Isolde', 'Jorah', 'Kael', 'Lyra', 'Maren', 'Nyx', 'Oberon', 'Perrin', 'Rhea', 'Soren', 'Thane', 'Ursa', 'Vesper', 'Wulf', 'Yvaine', 'Zephyr', 'Bodil', 'Ciri', 'Dagny', 'Emrys', 'Freya', 'Gideon', 'Halvar', 'Idris', 'Juno', 'Kestrel'];
  U.humanName = () => U.pick(FIRST) + (U.chance(0.3) ? ' ' + U.pick(SYL1) + U.pick(SYL2) : '');
  U.leaderTitle = (gov, female) => {
    const t = {
      Tribe: ['Chief', 'Chieftess'], Chiefdom: ['High Chief', 'High Chieftess'], Kingdom: ['King', 'Queen'],
      Empire: ['Emperor', 'Empress'], Republic: ['Consul', 'Consul'], Democracy: ['President', 'President'],
      Theocracy: ['Prophet', 'Prophetess'], Dictatorship: ['Supreme Leader', 'Supreme Leader'],
      Federation: ['Chancellor', 'Chancellor'], Hive: ['Overmind', 'Overmind'], Technocracy: ['Director', 'Director'],
      Anarchy: ['Nobody', 'Nobody'], Monarchy: ['King', 'Queen'], Sultanate: ['Sultan', 'Sultana'],
      Oligarchy: ['Magnate', 'Magnate'], Communes: ['Speaker', 'Speaker'], Cult: ['High Priest', 'High Priestess'],
    };
    const arr = t[gov] || ['Leader', 'Leader'];
    return arr[female ? 1 : 0];
  };

  // ---------- Misc ----------
  U.now = () => performance.now();
  U.downloadText = (filename, text, mime = 'application/json') => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  };
  U.el = (tag, attrs, children) => {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else if (k === 'style') e.style.cssText = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (children) for (const c of [].concat(children)) if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return e;
  };

  MB.util = U;
})();
