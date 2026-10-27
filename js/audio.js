'use strict';
// MineBomb - synthesized sound effects (WebAudio, no assets)
(function () {
  const A = { ctx: null, master: null, volume: 0.5, muted: false, last: {}, enabled: true };
  function init() {
    if (A.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      A.ctx = new AC();
      A.master = A.ctx.createGain();
      A.master.gain.value = A.volume;
      A.master.connect(A.ctx.destination);
      return true;
    } catch (e) { return false; }
  }
  A.init = init;
  A.setVolume = (v) => { A.volume = v; if (A.master) A.master.gain.value = A.muted ? 0 : v; };
  A.toggleMute = () => { A.muted = !A.muted; if (A.master) A.master.gain.value = A.muted ? 0 : A.volume; return A.muted; };

  function env(gainNode, t0, a, d, peak = 1) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(peak, t0 + a);
    g.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }
  function tone(freq, type, a, d, peak = 0.3, slideTo = null) {
    const c = A.ctx, t0 = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo != null) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + a + d);
    env(g, t0, a, d, peak);
    o.connect(g); g.connect(A.master);
    o.start(t0); o.stop(t0 + a + d + 0.05);
  }
  function noise(dur, peak = 0.4, filterFreq = 1000, type = 'lowpass', slideTo = null) {
    const c = A.ctx, t0 = c.currentTime;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(filterFreq, t0);
    if (slideTo != null) f.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    const g = c.createGain(); env(g, t0, 0.01, dur - 0.01, peak);
    src.connect(f); f.connect(g); g.connect(A.master);
    src.start(t0);
  }
  const SFX = {
    click: () => tone(800, 'square', 0.005, 0.05, 0.08),
    select: () => { tone(600, 'square', 0.005, 0.06, 0.08); setTimeout(() => tone(900, 'square', 0.005, 0.06, 0.08), 40); },
    boom: () => { noise(0.5, 0.6, 600, 'lowpass', 80); tone(90, 'sine', 0.01, 0.35, 0.5, 30); },
    bigboom: () => { noise(1.2, 0.8, 500, 'lowpass', 60); tone(60, 'sine', 0.01, 0.8, 0.6, 20); },
    nuke: () => { noise(2.5, 0.9, 900, 'lowpass', 40); tone(50, 'sine', 0.05, 2, 0.7, 15); setTimeout(() => noise(1.5, 0.4, 300, 'lowpass', 50), 500); },
    thunder: () => { noise(0.9, 0.5, 1500, 'lowpass', 100); tone(120, 'sawtooth', 0.005, 0.2, 0.2, 40); },
    zap: () => { tone(1200, 'sawtooth', 0.005, 0.12, 0.2, 200); noise(0.1, 0.2, 4000, 'highpass'); },
    laser: () => tone(1800, 'square', 0.005, 0.1, 0.12, 300),
    arrow: () => noise(0.08, 0.15, 3000, 'highpass'),
    cannon: () => { noise(0.3, 0.4, 800, 'lowpass', 100); tone(120, 'sine', 0.01, 0.2, 0.3, 50); },
    pop: () => tone(500, 'sine', 0.005, 0.08, 0.2, 900),
    spawn: () => { tone(400, 'triangle', 0.01, 0.1, 0.15, 700); },
    magic: () => { tone(880, 'sine', 0.01, 0.3, 0.15, 1760); setTimeout(() => tone(1320, 'sine', 0.01, 0.3, 0.12, 2200), 80); },
    holy: () => { tone(523, 'sine', 0.05, 0.6, 0.15); setTimeout(() => tone(659, 'sine', 0.05, 0.6, 0.15), 100); setTimeout(() => tone(784, 'sine', 0.05, 0.8, 0.15), 200); },
    evil: () => { tone(220, 'sawtooth', 0.02, 0.6, 0.2, 60); tone(233, 'sawtooth', 0.02, 0.6, 0.15, 55); },
    rain: () => noise(0.6, 0.12, 2500, 'bandpass'),
    wind: () => noise(1.2, 0.2, 500, 'bandpass', 900),
    fire: () => noise(0.4, 0.25, 1200, 'lowpass', 400),
    freeze: () => { tone(2000, 'sine', 0.01, 0.4, 0.12, 3000); noise(0.3, 0.1, 5000, 'highpass'); },
    rumble: () => { noise(1.5, 0.5, 200, 'lowpass', 60); tone(40, 'sine', 0.05, 1.2, 0.5, 25); },
    wave: () => noise(1.5, 0.4, 900, 'lowpass', 200),
    roar: () => { tone(90, 'sawtooth', 0.05, 0.8, 0.4, 60); noise(0.8, 0.3, 400, 'lowpass', 150); },
    build: () => { tone(300, 'square', 0.005, 0.05, 0.1); setTimeout(() => tone(350, 'square', 0.005, 0.05, 0.1), 70); },
    coin: () => { tone(1200, 'square', 0.005, 0.08, 0.1); setTimeout(() => tone(1600, 'square', 0.005, 0.15, 0.1), 60); },
    achievement: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 'triangle', 0.01, 0.3, 0.15), i * 90)); },
    error: () => tone(200, 'square', 0.01, 0.15, 0.12, 120),
    open: () => tone(500, 'triangle', 0.005, 0.08, 0.08, 800),
    close: () => tone(800, 'triangle', 0.005, 0.08, 0.08, 500),
    moo: () => tone(180, 'sawtooth', 0.05, 0.4, 0.15, 140),
    party: () => { [880, 988, 1108, 1318].forEach((f, i) => setTimeout(() => tone(f, 'square', 0.01, 0.12, 0.1), i * 60)); },
    whoosh: () => noise(0.3, 0.25, 2000, 'bandpass', 300),
    heal: () => { tone(660, 'sine', 0.02, 0.3, 0.12, 990); },
    ufo: () => { tone(400, 'sine', 0.05, 0.6, 0.12, 900); setTimeout(() => tone(900, 'sine', 0.05, 0.6, 0.1, 400), 300); },
    quack: () => tone(600, 'sawtooth', 0.01, 0.15, 0.12, 300),
  };
  A.play = (name) => {
    if (!A.enabled || A.muted) return;
    if (!A.ctx) return;
    const now = performance.now();
    // rate limit per sound
    const minGap = (name === 'boom' || name === 'thunder' || name === 'cannon') ? 80 : 40;
    if (A.last[name] && now - A.last[name] < minGap) return;
    A.last[name] = now;
    const f = SFX[name];
    if (!f) return;
    try { f(); } catch (e) { /* ignore */ }
  };
  A.names = Object.keys(SFX);
  MB.audio = A;
})();
