// Dynamic Web Audio API Sound Generator for Temple Runner
class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private musicInterval: any = null;
  private beatIndex: number = 0;
  private isMusicPlaying: boolean = false;

  constructor() {
    // Lazy initialized on first user interaction to comply with browser autoplay security policies
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioContextClass();
      } catch (err) {
        console.error('Web Audio API not supported', err);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (!val) {
      this.stopMusic();
    } else {
      this.initCtx();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  // Synthesizes a golden coin collect ding
  public playCoin() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // First high note
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, now); // B5 note
    osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6 note
    
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.3);
  }

  // Synthesizes a gem collect chime
  public playGem() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1046.50, now); // C6
    osc.frequency.exponentialRampToValueAtTime(2093.00, now + 0.25); // C7
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Synthesizes a jump sound (upward pitch sweep)
  public playJump() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(550, now + 0.15);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Synthesizes a slide sound (noise hiss + downward sweep)
  public playSlide() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Create bandpass filtered noise or simple low frequency triangle sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);
    
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    
    // Lowpass filter to muffle the slide
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.25);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Synthesizes a dynamic crash impact
  public playCrash() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Deep rumbling sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(10, now + 0.5);
    
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.linearRampToValueAtTime(40, now + 0.5);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.5);
  }

  // Synthesizes a growl / roar of the chasing monster
  public playBeastGrowl() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const oscMod = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    const modulatorGain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, now); // Low C
    osc.frequency.linearRampToValueAtTime(45, now + 0.7);

    // Ring modulation for beastly texturing
    oscMod.type = 'sawtooth';
    oscMod.frequency.setValueAtTime(30, now);
    modulatorGain.gain.setValueAtTime(15, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, now);
    filter.Q.value = 8;

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.8);

    oscMod.connect(modulatorGain);
    modulatorGain.connect(osc.frequency);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    oscMod.start(now);
    osc.stop(now + 0.8);
    oscMod.stop(now + 0.8);
  }

  // Synthesizes a shield activate effect
  public playShieldActivate() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.4);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Melodic game over chime
  public playGameOver() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [392.00, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4 (descending minor chord)
    
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      const noteStart = now + i * 0.15;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.setValueAtTime(0.18, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.4);
      
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      
      osc.start(noteStart);
      osc.stop(noteStart + 0.45);
    });
  }

  // Start background procedural music loops (drums and ambient running bassline)
  public startMusic() {
    if (!this.enabled || this.isMusicPlaying) return;
    this.initCtx();
    if (!this.ctx) return;

    this.isMusicPlaying = true;
    this.beatIndex = 0;
    
    // Beats per minute: 135 bpm -> ~4 beats per second -> eighth notes are 222ms
    const stepTime = 0.222; 
    
    const playSequencerStep = () => {
      if (!this.isMusicPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      
      // Step definitions (8 steps loop)
      // 0: Kick, 1: Hat, 2: Bass, 3: Kick + Hat, 4: Bass, 5: Hat, 6: Bass, 7: Bass/Snare
      const isKick = this.beatIndex % 4 === 0;
      const isSnare = this.beatIndex === 4 || this.beatIndex === 12;
      const isHat = this.beatIndex % 2 === 1;
      
      // Rhythmic Tribal Bassline
      let bassFreq = 0;
      if (this.beatIndex % 8 === 0) bassFreq = 73.42; // D2
      else if (this.beatIndex % 8 === 2) bassFreq = 73.42;
      else if (this.beatIndex % 8 === 4) bassFreq = 82.41; // E2 or F2
      else if (this.beatIndex % 8 === 6) bassFreq = 98.00; // G2 or A2
      
      // Execute Kick
      if (isKick) {
        const kOsc = this.ctx.createOscillator();
        const kGain = this.ctx.createGain();
        kOsc.frequency.setValueAtTime(140, now);
        kOsc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
        
        kGain.gain.setValueAtTime(0.25, now);
        kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        
        kOsc.connect(kGain);
        kGain.connect(this.ctx.destination);
        kOsc.start(now);
        kOsc.stop(now + 0.12);
      }
      
      // Execute Snare-ish noise or tribal impact
      if (isSnare) {
        const sOsc = this.ctx.createOscillator();
        const sGain = this.ctx.createGain();
        sOsc.type = 'triangle';
        sOsc.frequency.setValueAtTime(180, now);
        sOsc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
        
        sGain.gain.setValueAtTime(0.12, now);
        sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        sOsc.connect(sGain);
        sGain.connect(this.ctx.destination);
        sOsc.start(now);
        sOsc.stop(now + 0.15);
      }

      // Execute subtle high hat
      if (isHat) {
        const hOsc = this.ctx.createOscillator();
        const hGain = this.ctx.createGain();
        hOsc.type = 'sawtooth';
        hOsc.frequency.setValueAtTime(10000, now);
        
        hGain.gain.setValueAtTime(0.02, now);
        hGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(7000, now);
        
        hOsc.connect(filter);
        filter.connect(hGain);
        hGain.connect(this.ctx.destination);
        
        hOsc.start(now);
        hOsc.stop(now + 0.05);
      }
      
      // Execute Tribal Bass Note
      if (bassFreq > 0) {
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bOsc.type = 'sawtooth';
        bOsc.frequency.setValueAtTime(bassFreq, now);
        
        bGain.gain.setValueAtTime(0.08, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, now);
        
        bOsc.connect(filter);
        filter.connect(bGain);
        bGain.connect(this.ctx.destination);
        
        bOsc.start(now);
        bOsc.stop(now + 0.18);
      }
      
      this.beatIndex = (this.beatIndex + 1) % 16;
    };
    
    // Beat loop scheduler
    this.musicInterval = setInterval(playSequencerStep, stepTime * 1000);
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const sound = new SoundEngine();
