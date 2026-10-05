import type { GameSoundEvent } from '../game/types';

type Wave = OscillatorType;

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private musicTimer: number | null = null;
  private droneNodes: Array<{ osc: OscillatorNode; gain: GainNode }> = [];
  private musicStep = 0;
  private musicEnabled = true;
  private sfxEnabled = true;
  private readonly lastPlayed = new Map<GameSoundEvent, number>();

  async unlock() {
    if (!this.ctx) this.createGraph();
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (this.musicGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setTargetAtTime(enabled ? 0.28 : 0.0001, now, 0.06);
    }

    if (enabled && this.ctx && this.ctx.state === 'running') {
      this.startMusic();
    } else if (!enabled) {
      this.stopMusic(false);
    }
  }

  setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
    if (this.sfxGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.sfxGain.gain.cancelScheduledValues(now);
      this.sfxGain.gain.setTargetAtTime(enabled ? 0.52 : 0.0001, now, 0.035);
    }
  }

  getMusicEnabled() {
    return this.musicEnabled;
  }

  getSfxEnabled() {
    return this.sfxEnabled;
  }

  startMusic() {
    if (!this.ctx || !this.musicGain || !this.musicEnabled) return;
    if (this.musicTimer !== null) return;

    this.startDrone(43.65, 0.045, 'sine');
    this.startDrone(65.41, 0.022, 'triangle', -6);

    this.musicStep = 0;
    this.playMusicStep();
    this.musicTimer = window.setInterval(() => {
      this.playMusicStep();
    }, 375);
  }

  stopMusic(fade = true) {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }

    const ctx = this.ctx;
    for (const node of this.droneNodes) {
      try {
        if (ctx && fade) {
          node.gain.gain.cancelScheduledValues(ctx.currentTime);
          node.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08);
          node.osc.stop(ctx.currentTime + 0.35);
        } else {
          node.osc.stop();
        }
      } catch {
        // Node may already be stopped.
      }
    }
    this.droneNodes = [];
  }

  play(event: GameSoundEvent) {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;

    const nowMs = performance.now();
    const minGap =
      event === 'shot'
        ? 55
        : event === 'enemyDeath'
          ? 42
          : event === 'playerHit'
            ? 110
            : 0;

    const previous = this.lastPlayed.get(event) ?? -Infinity;
    if (nowMs - previous < minGap) return;
    this.lastPlayed.set(event, nowMs);

    switch (event) {
      case 'shot':
        this.tone(780, 0.055, 'square', 0.024, 410);
        break;
      case 'enemyDeath':
        this.tone(205, 0.085, 'triangle', 0.032, 92);
        break;
      case 'playerHit':
        this.tone(96, 0.16, 'sawtooth', 0.085, 52);
        this.noise(0.09, 0.028, 850);
        break;
      case 'levelUp':
        this.sequence([329.63, 440, 659.25], 0.075, 0.06, 'sine');
        break;
      case 'upgrade':
        this.sequence([261.63, 392], 0.065, 0.045, 'triangle');
        break;
      case 'fusionReady':
        this.sequence([164.81, 246.94, 369.99, 554.37], 0.085, 0.055, 'sine');
        break;
      case 'fusion':
        this.chord([130.81, 196, 293.66, 440], 0.72, 0.055, 'sine');
        this.tone(880, 0.42, 'triangle', 0.035, 1320);
        break;
      case 'chestCommon':
        this.sequence([392, 523.25], 0.075, 0.05, 'triangle');
        break;
      case 'chestRare':
        this.sequence([392, 523.25, 783.99], 0.075, 0.058, 'sine');
        break;
      case 'chestMythic':
        this.chord([261.63, 392, 523.25, 783.99], 0.75, 0.055, 'sine');
        this.sequence([783.99, 1046.5, 1318.5], 0.09, 0.04, 'triangle');
        break;
      case 'bossSpawn':
        this.tone(55, 0.95, 'sawtooth', 0.1, 82.41);
        this.noise(0.42, 0.04, 260);
        break;
      case 'bossStrikeCharge':
        this.tone(180, 0.5, 'sine', 0.055, 760);
        break;
      case 'bossStrike':
        this.tone(58, 0.36, 'square', 0.1, 34);
        this.noise(0.18, 0.09, 1500);
        break;
      case 'bossDeath':
        this.tone(110, 0.48, 'sawtooth', 0.09, 43.65);
        this.sequence([220, 329.63, 493.88], 0.1, 0.055, 'triangle');
        break;
      case 'axonSpike':
        this.tone(520, 0.11, 'square', 0.045, 980);
        break;
      case 'calciumCascade':
        this.tone(880, 0.3, 'sine', 0.055, 220);
        this.noise(0.13, 0.035, 2200);
        break;
      case 'gameOver':
        this.sequence([220, 174.61, 130.81, 87.31], 0.18, 0.055, 'sawtooth');
        break;
      case 'gameClear':
        this.chord([261.63, 329.63, 392, 523.25], 1.15, 0.06, 'sine');
        this.sequence([523.25, 659.25, 783.99, 1046.5], 0.13, 0.045, 'triangle');
        break;
    }
  }

  destroy() {
    this.stopMusic(false);
    this.lastPlayed.clear();
    const ctx = this.ctx;
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.compressor = null;
    if (ctx && ctx.state !== 'closed') {
      void ctx.close();
    }
  }

  private createGraph() {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    const musicGain = ctx.createGain();
    const sfxGain = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();

    master.gain.value = 0.78;
    musicGain.gain.value = this.musicEnabled ? 0.28 : 0.0001;
    sfxGain.gain.value = this.sfxEnabled ? 0.52 : 0.0001;

    compressor.threshold.value = -18;
    compressor.knee.value = 14;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.18;

    musicGain.connect(compressor);
    sfxGain.connect(compressor);
    compressor.connect(master);
    master.connect(ctx.destination);

    this.ctx = ctx;
    this.master = master;
    this.musicGain = musicGain;
    this.sfxGain = sfxGain;
    this.compressor = compressor;
  }

  private startDrone(
    frequency: number,
    level: number,
    type: Wave,
    detune = 0,
  ) {
    const ctx = this.ctx;
    const destination = this.musicGain;
    if (!ctx || !destination) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.value = frequency;
    osc.detune.value = detune;
    gain.gain.value = level;
    filter.type = 'lowpass';
    filter.frequency.value = 310;
    filter.Q.value = 0.55;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    osc.start();

    this.droneNodes.push({ osc, gain });
  }

  private playMusicStep() {
    if (!this.ctx || !this.musicGain || !this.musicEnabled) return;

    const upper = [
      0, 220, 0, 293.66,
      246.94, 0, 329.63, 0,
      220, 0, 261.63, 293.66,
      0, 246.94, 196, 0,
    ];
    const bass = [
      55, 55, 65.41, 65.41,
      49, 49, 61.74, 61.74,
      55, 55, 73.42, 73.42,
      49, 49, 65.41, 65.41,
    ];

    const step = this.musicStep % upper.length;
    const note = upper[step];
    if (note > 0) {
      this.musicTone(note, 0.24, 'triangle', 0.028);
      if (step % 4 === 3) {
        this.musicTone(note * 2, 0.11, 'sine', 0.012);
      }
    }

    if (step % 2 === 0) {
      this.musicTone(bass[step], 0.32, 'sine', 0.035);
    }

    if (step === 0 || step === 8) {
      this.musicNoise(0.12, 0.009, 1100);
    }

    this.musicStep += 1;
  }

  private musicTone(
    frequency: number,
    duration: number,
    type: Wave,
    level: number,
  ) {
    this.makeTone(
      this.musicGain,
      frequency,
      duration,
      type,
      level,
      undefined,
      0.018,
    );
  }

  private tone(
    frequency: number,
    duration: number,
    type: Wave,
    level: number,
    slideTo?: number,
  ) {
    this.makeTone(
      this.sfxGain,
      frequency,
      duration,
      type,
      level,
      slideTo,
      0.004,
    );
  }

  private makeTone(
    destination: AudioNode | null,
    frequency: number,
    duration: number,
    type: Wave,
    level: number,
    slideTo?: number,
    attack = 0.004,
  ) {
    const ctx = this.ctx;
    if (!ctx || !destination) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, frequency), now);
    if (slideTo && slideTo > 0) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, slideTo),
        now + duration,
      );
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, level),
      now + attack,
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + Math.max(attack + 0.01, duration),
    );

    osc.connect(gain);
    gain.connect(destination);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  private sequence(
    notes: number[],
    spacing: number,
    level: number,
    type: Wave,
  ) {
    const ctx = this.ctx;
    const destination = this.sfxGain;
    if (!ctx || !destination) return;

    notes.forEach((note, index) => {
      const delay = index * spacing;
      window.setTimeout(() => {
        if (this.ctx === ctx && this.sfxEnabled) {
          this.tone(note, spacing * 1.8, type, level);
        }
      }, delay * 1000);
    });
  }

  private chord(
    notes: number[],
    duration: number,
    level: number,
    type: Wave,
  ) {
    const perVoice = level / Math.max(1, Math.sqrt(notes.length));
    for (const note of notes) {
      this.tone(note, duration, type, perVoice);
    }
  }

  private noise(duration: number, level: number, cutoff: number) {
    this.makeNoise(this.sfxGain, duration, level, cutoff);
  }

  private musicNoise(duration: number, level: number, cutoff: number) {
    this.makeNoise(this.musicGain, duration, level, cutoff);
  }

  private makeNoise(
    destination: AudioNode | null,
    duration: number,
    level: number,
    cutoff: number,
  ) {
    const ctx = this.ctx;
    if (!ctx || !destination) return;

    const frames = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    filter.Q.value = 0.6;
    gain.gain.setValueAtTime(level, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(now);
  }
}
