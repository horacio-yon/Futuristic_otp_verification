(function (g) {
  'use strict';
  const MASTER_GAIN = 0.3;

  /** Synthesized sound effects built with the Web Audio API. */
  class AudioController {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.noise = null;
      this.enabled = true;
    }

    // Create the audio context lazily because browsers require a user gesture.
    unlock() {
      if (!this.ctx) {
        const AudioContextClass = g.AudioContext || g.webkitAudioContext;
        if (!AudioContextClass) return;
        this.ctx = new AudioContextClass();
        this.master = this.ctx.createGain();
        this.master.gain.value = MASTER_GAIN;
        this.master.connect(this.ctx.destination);
        this.noise = this._noiseBuffer();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    _ready() { return this.enabled && this.ctx && this.ctx.state === 'running'; }

    _noiseBuffer() {
      const length = Math.floor(this.ctx.sampleRate * 0.03);
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      return buffer;
    }

    _tone(frequency, delay, duration, type, volume, endFrequency) {
      const time = this.ctx.currentTime + delay;
      const oscillator = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, time);
      if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(volume, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      oscillator.connect(gain).connect(this.master);
      oscillator.start(time);
      oscillator.stop(time + duration + 0.02);
    }

    // A short filtered noise click layered with a soft low thud.
    click() {
      if (!this._ready()) return;
      const source = this.ctx.createBufferSource();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      source.buffer = this.noise;
      filter.type = 'bandpass';
      filter.frequency.value = 2400;
      gain.gain.value = 0.7;
      source.connect(filter).connect(gain).connect(this.master);
      source.start();
      this._tone(170, 0, 0.04, 'sine', 0.25);
    }

    confirm() {
      if (!this._ready()) return;
      this._tone(660, 0, 0.12, 'sine', 0.3);
      this._tone(990, 0.08, 0.18, 'sine', 0.25);
    }

    unlock_() {
      if (!this._ready()) return;
      this._tone(300, 0, 0.35, 'triangle', 0.25, 700);
      this.click();
    }

    success() {
      if (!this._ready()) return;
      [523, 659, 784, 1047].forEach((frequency, index) => {
        this._tone(frequency, index * 0.11, 0.45, 'sine', 0.22);
      });
    }

    error() {
      if (!this._ready()) return;
      this._tone(160, 0, 0.22, 'sawtooth', 0.18, 90);
      this._tone(150, 0.26, 0.28, 'sawtooth', 0.18, 80);
    }
  }

  g.AudioController = AudioController;
})(window);
