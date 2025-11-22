class AudioController {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private ambientOscillators: OscillatorNode[] = [];
  private ambientGain: GainNode | null = null;

  constructor() {
    // Lazy init
  }

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (val) {
      if (this.ctx?.state === 'suspended') {
        this.ctx.resume();
      }
      this.startAmbience();
    } else {
      this.stopAmbience();
    }
  }

  public isEnabled() {
    return this.enabled;
  }

  public startAmbience() {
    if (!this.enabled || this.ambientOscillators.length > 0) return;
    this.init();
    if (!this.ctx) return;

    // Create a deep space drone effect
    const masterGain = this.ctx.createGain();
    masterGain.gain.value = 0.15; // Low volume
    masterGain.connect(this.ctx.destination);
    this.ambientGain = masterGain;

    // Osc 1: Deep drone
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 50;
    
    // Osc 2: Slight detune for texture
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 52;

    // LFO to modulate amplitude slightly (breathing effect)
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1; // Slow pulse
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.05;
    
    lfo.connect(lfoGain.gain);
    osc1.connect(masterGain);
    osc2.connect(masterGain);

    osc1.start();
    osc2.start();
    lfo.start();

    this.ambientOscillators = [osc1, osc2, lfo];
  }

  public stopAmbience() {
    this.ambientOscillators.forEach(osc => {
      try { osc.stop(); } catch (e) {}
    });
    this.ambientOscillators = [];
    if (this.ambientGain) {
        this.ambientGain.disconnect();
        this.ambientGain = null;
    }
  }

  private playTone(freq: number, type: OscillatorType, delay: number, duration: number, vol: number = 0.1) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.start(t);
    osc.stop(t + duration);
  }

  public playCorrect() {
    // More "crystal" sound
    this.playTone(523.25, 'sine', 0, 0.3, 0.2); // C5
    this.playTone(659.25, 'sine', 0.1, 0.3, 0.2); // E5
    this.playTone(783.99, 'sine', 0.2, 0.4, 0.2); // G5
    this.playTone(1046.50, 'sine', 0.3, 0.5, 0.1); // C6
  }

  public playWrong() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.4);
    
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.4);
  }

  public playLevelUp() {
    this.playTone(440, 'square', 0, 0.4);
    this.playTone(880, 'square', 0.1, 0.4);
    this.playTone(1760, 'square', 0.2, 0.6);
  }

  public playPenalty() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(100, t + 0.2);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  public playRadarPing() {
     this.playTone(880, 'sine', 0, 0.1, 0.05);
     this.playTone(1760, 'sine', 0.1, 0.1, 0.03);
  }
}

export const audioService = new AudioController();