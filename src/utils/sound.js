// Web Audio API synthesizer for instant, zero-latency POS sounds
class PosAudioService {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // Toggle sound on/off
  toggleSound() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  // Pleasant crisp POS barcode scan beep (1850Hz sine wave, 80ms)
  playScanSuccess() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1850, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.075);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (_) {}
  }

  // Warning / error double buzz for out-of-stock, not found, or limit reached
  playWarning() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.setValueAtTime(180, t + 0.08);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.07);
      gain.gain.setValueAtTime(0.22, t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.19);
    } catch (_) {}
  }

  // Uplifting 3-tone chime for invoice completion
  playCheckoutSuccess() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      [
        { freq: 523.25, start: 0, dur: 0.10 }, // C5
        { freq: 659.25, start: 0.08, dur: 0.10 }, // E5
        { freq: 783.99, start: 0.16, dur: 0.20 }, // G5
      ].forEach(note => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, t + note.start);

        gain.gain.setValueAtTime(0.18, t + note.start);
        gain.gain.exponentialRampToValueAtTime(0.001, t + note.start + note.dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t + note.start);
        osc.stop(t + note.start + note.dur + 0.01);
      });
    } catch (_) {}
  }
}

export const posSound = new PosAudioService();

