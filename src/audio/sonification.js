/**
 * FOUNDRY // FIELD DYNAMICS SONIFICATION ENGINE
 * Web Audio API Acoustic Synthesizer
 * Maps wave curvature, kinetic energy cascades, and soliton collisions
 * to resonant frequencies, harmonic overtones, and stereo spatialization.
 */

class SolitonSonifier {
  constructor() {
    this.ctx = null;
    this.isMuted = true;
    this.masterGain = null;
    this.droneOsc = null;
    this.droneGain = null;
    this.collisionFilter = null;
    this.harmonicOscs = [];
    this.harmonicGains = [];
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();

    // Master bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Resonant low-pass filter modulated by spatial gradient energy
    this.collisionFilter = this.ctx.createBiquadFilter();
    this.collisionFilter.type = 'lowpass';
    this.collisionFilter.frequency.setValueAtTime(200, this.ctx.currentTime);
    this.collisionFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);
    this.collisionFilter.connect(this.masterGain);

    // Fundamental baseline drone
    this.droneOsc = this.ctx.createOscillator();
    this.droneOsc.type = 'sine';
    this.droneOsc.frequency.setValueAtTime(65.41, this.ctx.currentTime); // C2

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    this.droneOsc.connect(this.droneGain);
    this.droneGain.connect(this.collisionFilter);
    this.droneOsc.start();

    // Harmonic bank
    const baseFreqs = [130.81, 196.00, 261.63];
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = i === 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(baseFreqs[i], this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      osc.connect(gain);
      gain.connect(this.collisionFilter);
      osc.start();

      this.harmonicOscs.push(osc);
      this.harmonicGains.push(gain);
    }

    this.isInitialized = true;
  }

  toggleMute() {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(this.isMuted ? 0.0 : 0.25, now + 0.08);
    }
    return this.isMuted;
  }

  update(metrics) {
    if (!this.isInitialized || this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;

    const curvature = metrics.maxCurvature || 0.0;
    const cutoff = Math.min(4800, 180 + curvature * 320);
    this.collisionFilter.frequency.setTargetAtTime(cutoff, now, 0.05);

    const fundamental = 65.41 + Math.min(20, (metrics.peakAmp || 1.0) * 3.5);
    this.droneOsc.frequency.setTargetAtTime(fundamental, now, 0.1);

    if (metrics.modeEnergies && metrics.modeEnergies.length > 0) {
      for (let i = 0; i < Math.min(3, metrics.modeEnergies.length); i++) {
        const e = metrics.modeEnergies[i].energy || 0.0;
        const targetGain = Math.min(0.3, Math.sqrt(e) * 0.4);
        this.harmonicGains[i].gain.setTargetAtTime(targetGain, now, 0.05);
      }
    } else {
      const activity = Math.min(0.25, (metrics.kineticEnergy || 0.0) * 0.05);
      for (let i = 0; i < 3; i++) {
        this.harmonicGains[i].gain.setTargetAtTime(activity / (i + 1), now, 0.08);
      }
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SolitonSonifier };
}
