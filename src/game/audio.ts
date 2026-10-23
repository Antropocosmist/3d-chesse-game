let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockAudio(): void {
  try {
    getCtx();
  } catch {
    /* ignore */
  }
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain = 0.045,
  freqEnd?: number,
): void {
  try {
    const c = getCtx();
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {
    /* ignore */
  }
}

export const sfx = {
  select: () => tone(560, 0.07, "sine", 0.035),
  move: () => tone(220, 0.14, "triangle", 0.05, 110),
  capture: () => {
    tone(150, 0.22, "sawtooth", 0.045, 48);
    tone(340, 0.1, "square", 0.025);
  },
  check: () => {
    tone(640, 0.1, "square", 0.035);
    window.setTimeout(() => tone(860, 0.14, "square", 0.035), 90);
  },
  mate: () => tone(180, 0.55, "sawtooth", 0.06, 55),
  promo: () => tone(420, 0.22, "sine", 0.04, 880),
  deny: () => tone(92, 0.08, "square", 0.03),
};
