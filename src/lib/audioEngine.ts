// App audio — everything here is synthesised with the Web Audio API at runtime,
// so there are no third-party recordings and no licensing concerns.
//
//  • playPageFlip()      — short paper flip for scrapbook page turns
//  • startDrawing()/stopDrawing() — soft chalk-on-whiteboard while a stroke happens
//  • background music    — cozy, looping pentatonic chimes over a warm pad
//
// Nothing is created until the user interacts with the page, so browser autoplay
// policies are respected and no errors are thrown when audio is unavailable.

export interface AudioSettings {
  musicOn: boolean;
  /** 0–1 */
  musicVolume: number;
  /** 0–1 */
  sfxVolume: number;
}

let settings: AudioSettings = { musicOn: false, musicVolume: 0.3, sfxVolume: 0.5 };
let ctx: AudioContext | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let unlocked = false;

// Music state
let musicTimer: number | null = null;
let padNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
let step = 0;

// Chalk state
let chalk: { src: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode } | null = null;
let chalkStopTimer: number | null = null;

// Flip guard
let lastFlip = 0;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor: typeof AudioContext | undefined =
    (window as any).AudioContext ?? (window as any).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    musicGain = ctx.createGain();
    musicGain.gain.value = settings.musicOn ? clamp01(settings.musicVolume) * 0.25 : 0;
    musicGain.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = clamp01(settings.sfxVolume) * 0.6;
    sfxGain.connect(ctx.destination);

    // Reusable white-noise buffer (2s) for flip + chalk textures.
    const len = Math.floor(ctx.sampleRate * 2);
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return ctx;
  } catch {
    ctx = null;
    return null;
  }
}

/** Called from the first real user gesture — safe to call repeatedly. */
export function unlockAudio() {
  const c = ensureContext();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  unlocked = true;
  if (settings.musicOn) startMusic();
}

export function installAudioUnlockListener() {
  if (typeof window === "undefined") return;
  const handler = () => unlockAudio();
  window.addEventListener("pointerdown", handler, { once: false, passive: true });
  window.addEventListener("keydown", handler, { passive: true });
}

export function setAudioSettings(next: AudioSettings) {
  settings = {
    musicOn: next.musicOn,
    musicVolume: clamp01(next.musicVolume),
    sfxVolume: clamp01(next.sfxVolume),
  };
  if (!ctx) return;
  if (sfxGain) sfxGain.gain.value = settings.sfxVolume * 0.6;
  if (musicGain) {
    const target = settings.musicOn ? settings.musicVolume * 0.25 : 0;
    try {
      musicGain.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.4);
    } catch {
      musicGain.gain.value = target;
    }
  }
  if (settings.musicOn && unlocked) startMusic();
  if (!settings.musicOn) stopMusic();
}

export function getAudioSettings(): AudioSettings {
  return settings;
}

// ─── Sound effects ────────────────────────────────────────────

/** One short paper-flip sound. Ignores calls that arrive too fast to overlap. */
export function playPageFlip() {
  if (settings.sfxVolume <= 0) return;
  const now = Date.now();
  if (now - lastFlip < 160) return;
  lastFlip = now;
  const c = ensureContext();
  if (!c || !noiseBuffer || !sfxGain) return;
  if (c.state === "suspended") c.resume().catch(() => {});

  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  src.playbackRate.value = 1.4;

  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1200, t);
  filter.frequency.exponentialRampToValueAtTime(3200, t + 0.16);
  filter.Q.value = 0.9;

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

  src.connect(filter).connect(gain).connect(sfxGain);
  src.start(t, Math.random() * 1.5);
  src.stop(t + 0.26);
}

/** Begin the chalk texture (called when a stroke starts). */
export function startDrawingSound() {
  if (settings.sfxVolume <= 0) return;
  const c = ensureContext();
  if (!c || !noiseBuffer || !sfxGain) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  if (chalkStopTimer) {
    window.clearTimeout(chalkStopTimer);
    chalkStopTimer = null;
  }
  if (chalk) {
    chalk.gain.gain.cancelScheduledValues(c.currentTime);
    chalk.gain.gain.linearRampToValueAtTime(0.16, c.currentTime + 0.05);
    return;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  src.playbackRate.value = 0.85;

  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 2200;
  filter.Q.value = 1.6;

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, c.currentTime);
  gain.gain.linearRampToValueAtTime(0.16, c.currentTime + 0.06);

  src.connect(filter).connect(gain).connect(sfxGain);
  src.start();
  chalk = { src, gain, filter };
}

/** Slight movement variation so the chalk doesn't feel static. */
export function nudgeDrawingSound(speed = 1) {
  if (!chalk || !ctx) return;
  const f = 1600 + Math.min(2400, speed * 60);
  try {
    chalk.filter.frequency.linearRampToValueAtTime(f, ctx.currentTime + 0.08);
  } catch {
    /* ignore */
  }
}

/** Fade out shortly after the user lifts the pen. */
export function stopDrawingSound(delayMs = 120) {
  if (!chalk || !ctx) return;
  if (chalkStopTimer) window.clearTimeout(chalkStopTimer);
  chalkStopTimer = window.setTimeout(() => {
    if (!chalk || !ctx) return;
    const { src, gain } = chalk;
    chalk = null;
    chalkStopTimer = null;
    const t = ctx.currentTime;
    try {
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0.0001, t + 0.18);
      src.stop(t + 0.25);
    } catch {
      try { src.stop(); } catch { /* ignore */ }
    }
  }, delayMs);
}

// ─── Background music ─────────────────────────────────────────
// Gentle F-major pentatonic chimes over two soft pad tones. Loops forever
// without a seam because it is generated note by note.

const MELODY = [698.46, 880, 1046.5, 880, 783.99, 587.33, 698.46, 880, 1046.5, 1174.66, 880, 783.99];

function chime(at: number, freq: number, vol: number) {
  if (!ctx || !musicGain) return;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 1.6);
  osc.connect(g).connect(musicGain);
  osc.start(at);
  osc.stop(at + 1.7);
}

function startPad() {
  if (!ctx || !musicGain || padNodes.length) return;
  [174.61, 261.63].forEach((f, i) => {
    const osc = ctx!.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = f;
    const g = ctx!.createGain();
    g.gain.setValueAtTime(0.0001, ctx!.currentTime);
    g.gain.linearRampToValueAtTime(i === 0 ? 0.05 : 0.03, ctx!.currentTime + 2);
    osc.connect(g).connect(musicGain!);
    osc.start();
    padNodes.push({ osc, gain: g });
  });
}

export function startMusic() {
  const c = ensureContext();
  if (!c || !settings.musicOn) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  if (musicTimer != null) return;
  startPad();
  const tick = () => {
    if (!ctx || !settings.musicOn) return;
    const at = ctx.currentTime + 0.05;
    chime(at, MELODY[step % MELODY.length], 0.09);
    if (step % 4 === 0) chime(at + 0.28, MELODY[(step + 2) % MELODY.length] / 2, 0.05);
    step++;
  };
  tick();
  musicTimer = window.setInterval(tick, 900);
}

export function stopMusic() {
  if (musicTimer != null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
  if (ctx) {
    const t = ctx.currentTime;
    padNodes.forEach(({ osc, gain }) => {
      try {
        gain.gain.cancelScheduledValues(t);
        gain.gain.linearRampToValueAtTime(0.0001, t + 0.6);
        osc.stop(t + 0.8);
      } catch {
        try { osc.stop(); } catch { /* ignore */ }
      }
    });
  }
  padNodes = [];
}
