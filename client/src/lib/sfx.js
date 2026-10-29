let ctx;
function beep(freq, dur, type = 'sine', vol = 0.12, delay = 0) {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(ctx.destination);
    const t = ctx.currentTime + delay;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur);
  } catch {
    /* الصوت اختياري */
  }
}
export const sfx = {
  ok: () => { beep(660, 0.12); beep(880, 0.18, 'sine', 0.12, 0.1); },
  bad: () => beep(170, 0.28, 'sawtooth', 0.07),
  win: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.18, 'triangle', 0.12, i * 0.12)),
};
