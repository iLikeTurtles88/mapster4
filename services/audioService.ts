class AudioController {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private ambientNodes: AudioNode[] = [];

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
    } else {
      this.stopAmbience();
    }
  }

  public isEnabled() {
    return this.enabled;
  }

  public startAmbience() {
    // Réservé pour une future musique de fond
  }

  public stopAmbience() {
    this.ambientNodes.forEach(node => {
      try { node.disconnect(); } catch (e) {}
    });
    this.ambientNodes = [];
  }

  // Générateur de son synthétique "Glassy"
  private playSynthTone(freq: number, time: number, duration: number, volume: number = 0.1, type: OscillatorType = 'triangle') {
    if (!this.enabled || !this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type; 
    osc.frequency.setValueAtTime(freq, time);

    // Enveloppe plus douce
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.03); 
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + duration);
  }

  public playCorrect() {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Accord Cmaj9 (C, E, G, B, D) étalé pour un effet "Magique/Victoire"
    // Très satisfaisant pour le cerveau
    const chord = [523.25, 659.25, 783.99, 987.77, 1174.66];
    
    chord.forEach((freq, i) => {
        this.playSynthTone(freq, t + (i * 0.04), 0.6, 0.08 - (i * 0.01));
    });
  }

  public playWrong() {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Son "Buzzer" mais doux, pas agressif
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.linearRampToValueAtTime(60, t + 0.25);
    
    // Filtre passe-bas pour étouffer le son (moins agressif)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.25);
  }

  public playLevelUp() {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Arpège rapide "Power Up"
    [440, 554, 659, 880, 1108, 1318, 1760].forEach((freq, i) => {
        this.playSynthTone(freq, t + i * 0.06, 0.4, 0.1, 'sine');
    });
  }

  public playPenalty() {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    // Son "Tech glitch"
    this.playSynthTone(150, t, 0.1, 0.1, 'square');
  }

  public playRadarPing() {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Son pur "Sonar"
    this.playSynthTone(1600, t, 0.2, 0.05, 'sine');
  }
}

export const audioService = new AudioController();