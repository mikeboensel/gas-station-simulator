/** Synthesized sound effects (WebAudio). No asset files. */

const MUTE_KEY = 'gss.muted';

export class Sfx {
  muted = localStorage.getItem(MUTE_KEY) === '1';
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private noise!: AudioBuffer;
  private hum: {
    gain: GainNode;
    filter: BiquadFilterNode;
    osc: OscillatorNode;
    src: AudioBufferSourceNode;
  } | null = null;

  /** Must be called from a user gesture before anything is audible. */
  unlock(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.7;
      this.master.connect(this.ctx.destination);
      this.noise = this.makeNoise();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.7, this.ctx.currentTime, 0.02);
    return this.muted;
  }

  startHum(): void {
    const ctx = this.ctx;
    if (!ctx || this.hum) return;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(0.32, ctx.currentTime, 0.04);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.18;
    src.connect(filter);
    osc.connect(oscGain).connect(filter);
    filter.connect(gain).connect(this.master);
    src.start();
    osc.start();
    this.hum = { gain, filter, osc, src };
  }

  /** 0..1 — raises the motor pitch as the sale nears the target. */
  setHumTension(t: number): void {
    if (!this.ctx || !this.hum) return;
    const now = this.ctx.currentTime;
    this.hum.filter.frequency.setTargetAtTime(500 + t * 1100, now, 0.05);
    this.hum.osc.frequency.setTargetAtTime(55 + t * 30, now, 0.05);
  }

  stopHum(): void {
    if (!this.ctx || !this.hum) return;
    const { gain } = this.hum;
    gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    const stopAt = this.ctx.currentTime + 0.4;
    this.hum.osc.stop(stopAt);
    this.hum.src.stop(stopAt);
    this.hum = null;
  }

  tick(t: number): void {
    this.tone(1400 + t * 900, 0.03, 'square', 0.05);
  }

  dollar(t: number): void {
    this.tone(660 + t * 440, 0.09, 'triangle', 0.18);
  }

  clunk(): void {
    this.tone(140, 0.12, 'square', 0.25, 60);
    this.burst(0.06, 900, 0.3);
  }

  falseStart(): void {
    this.tone(220, 0.15, 'triangle', 0.2, 160);
  }

  good(): void {
    [523, 659, 784].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.2, f, i * 0.08));
  }

  perfect(): void {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.22, f, i * 0.07));
    this.tone(2093, 0.6, 'sine', 0.1, 2093, 0.38);
  }

  star(i: number): void {
    this.tone(880 * 2 ** (i * 4 / 12), 0.14, 'sine', 0.2);
  }

  boom(power = 1, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, t0);
    filter.frequency.exponentialRampToValueAtTime(80, t0 + 1.4);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.9 * power, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.6);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0);
    src.stop(t0 + 1.7);
    this.tone(90, 0.9, 'sine', 0.7 * power, 30, delay);
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    endFreq = freq,
    delay = 0,
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private burst(dur: number, freq: number, vol: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
    src.stop(ctx.currentTime + dur + 0.02);
  }

  private makeNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }
}
