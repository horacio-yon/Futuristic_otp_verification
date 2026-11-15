(function (g) {
  'use strict';
  const MASTER_GAIN = 0.3;

  /** Synthesized, discreet sound effects built on the Web Audio API. */
  class AudioController {
    constructor() { this.ctx = null; this.master = null; this.noise = null; this.enabled = true; }

    // Create the context lazily: browsers require a user gesture first.
    unlock() {
      if (!this.ctx) {
        const AC = g.AudioContext || g.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = MASTER_GAIN;
        this.master.connect(this.ctx.destination);
        this.noise = this._noiseBuffer();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    setEnabled(on) { this.enabled = on; }
    _ready() { return this.enabled && this.ctx; }

    _noiseBuffer() {
      const len = Math.floor(this.ctx.sampleRate * 0.03);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      return buf;
    }

    _tone(freq, at, dur, type, vol, endFreq) {
      const t = this.ctx.currentTime + at;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }

    // Mechanical tick: filtered noise burst plus a low thud.
    click() {
      if (!this._ready()) return;
      const src = this.ctx.createBufferSource();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      src.buffer = this.noise;
      filter.type = 'bandpass';
      filter.frequency.value = 2400;
      gain.gain.value = 0.7;
      src.connect(filter).connect(gain).connect(this.master);
      src.start();
      this._tone(170, 0, 0.04, 'sine', 0.25);
    }

    confirm() { if (!this._ready()) return; this._tone(660, 0, 0.12, 'sine', 0.3); this._tone(990, 0.08, 0.18, 'sine', 0.25); }
    unlock_() { if (!this._ready()) return; this._tone(300, 0, 0.35, 'triangle', 0.25, 700); this.click(); }
    success() { if (!this._ready()) return; [523, 659, 784, 1047].forEach((f, i) => this._tone(f, i * 0.11, 0.45, 'sine', 0.22)); }
    error() { if (!this._ready()) return; this._tone(160, 0, 0.22, 'sawtooth', 0.18, 90); this._tone(150, 0.26, 0.28, 'sawtooth', 0.18, 80); }
  }

  g.AudioController = AudioController;
})(window);
