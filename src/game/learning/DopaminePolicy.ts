import type { WholeBrainOutput } from '../types';

export type DopamineSnapshot = {
  generation: number;
  lifetimeReward: number;
  positiveEvents: number;
  negativeEvents: number;
  updates: number;
  baseline: number;
  exploration: number;
  recentReward: number;
};

type SavedState = {
  version: 1;
  learned: number[][];
  baseline: number;
  lifetimeReward: number;
  positiveEvents: number;
  negativeEvents: number;
  updates: number;
  generation: number;
};

const STORAGE_KEY = 'flyswarm:dopamine-policy:v1';
const INPUTS = 8;
const OUTPUTS = 2;

const BASE_WEIGHTS = [
  // turn command: preserve the connectome DNa02 imbalance as the initial policy.
  [1.15, 0, 0, 0, 0, 0, 0, 0],
  // drive command: walk/escape/wing forward, MDN and stop backward/braking.
  [0, 0.9, -0.78, 0.82, -0.72, 0.34, 0.08, 0],
];

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const gaussian = () => {
  const u = Math.max(Number.EPSILON, Math.random());
  const v = Math.max(Number.EPSILON, Math.random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

export class DopaminePolicy {
  private learned = Array.from({ length: OUTPUTS }, () =>
    Array.from({ length: INPUTS }, () => 0),
  );
  private eligibility = Array.from({ length: OUTPUTS }, () =>
    Array.from({ length: INPUTS }, () => 0),
  );
  private baseline = 0;
  private lifetimeReward = 0;
  private positiveEvents = 0;
  private negativeEvents = 0;
  private updates = 0;
  private generation = 1;
  private recentReward = 0;
  private lastSave = 0;
  private readonly learningRate = 0.0025;
  private readonly eligibilityDecay = 0.86;

  constructor() {
    this.restore();
  }

  act(output: WholeBrainOutput) {
    const features = [
      output.turn,
      output.forward,
      output.backward,
      output.escape,
      output.stop,
      output.wing,
      output.activity,
      1,
    ];

    const exploration = this.getExploration();
    const commands = [0, 0];

    for (let out = 0; out < OUTPUTS; out += 1) {
      let mean = 0;
      for (let i = 0; i < INPUTS; i += 1) {
        mean += (BASE_WEIGHTS[out][i] + this.learned[out][i]) * features[i];
      }

      const noise = gaussian() * exploration;
      commands[out] = mean + noise;

      // Gaussian-policy score function with an eligibility trace.
      const scale = noise / Math.max(0.0001, exploration * exploration);
      for (let i = 0; i < INPUTS; i += 1) {
        this.eligibility[out][i] =
          this.eligibility[out][i] * this.eligibilityDecay +
          scale * features[i];
      }
    }

    return {
      turn: clamp(commands[0], -1, 1),
      drive: clamp(commands[1], -1, 1),
    };
  }

  reward(value: number) {
    if (!Number.isFinite(value) || value === 0) return;

    const reward = clamp(value, -2.5, 2.5);
    const advantage = reward - this.baseline;
    this.baseline = this.baseline * 0.96 + reward * 0.04;
    this.lifetimeReward += reward;
    this.recentReward = reward;

    if (reward > 0) this.positiveEvents += 1;
    else this.negativeEvents += 1;

    for (let out = 0; out < OUTPUTS; out += 1) {
      for (let i = 0; i < INPUTS; i += 1) {
        this.learned[out][i] = clamp(
          this.learned[out][i] +
            this.learningRate * advantage * this.eligibility[out][i],
          -1.6,
          1.6,
        );
      }
    }

    this.updates += 1;
    this.save(false);
  }

  nextGeneration() {
    this.generation += 1;
    this.eligibility.forEach((row) => row.fill(0));
    this.save(true);
  }

  getSnapshot(): DopamineSnapshot {
    return {
      generation: this.generation,
      lifetimeReward: this.lifetimeReward,
      positiveEvents: this.positiveEvents,
      negativeEvents: this.negativeEvents,
      updates: this.updates,
      baseline: this.baseline,
      exploration: this.getExploration(),
      recentReward: this.recentReward,
    };
  }

  private getExploration() {
    // Keep a small amount of exploration even in mature policies.
    return clamp(0.16 - this.updates * 0.00008, 0.035, 0.16);
  }

  private restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw) as SavedState;
      if (state.version !== 1) return;
      if (
        !Array.isArray(state.learned) ||
        state.learned.length !== OUTPUTS ||
        state.learned.some((row) => !Array.isArray(row) || row.length !== INPUTS)
      ) {
        return;
      }

      this.learned = state.learned.map((row) =>
        row.map((value) => clamp(Number(value) || 0, -1.6, 1.6)),
      );
      this.baseline = Number(state.baseline) || 0;
      this.lifetimeReward = Number(state.lifetimeReward) || 0;
      this.positiveEvents = Number(state.positiveEvents) || 0;
      this.negativeEvents = Number(state.negativeEvents) || 0;
      this.updates = Number(state.updates) || 0;
      this.generation = Math.max(1, Number(state.generation) || 1);
    } catch {
      // Corrupt learning state falls back to the biologically-inspired seed policy.
    }
  }

  private save(force: boolean) {
    const now = performance.now();
    if (!force && now - this.lastSave < 1200) return;
    this.lastSave = now;

    const state: SavedState = {
      version: 1,
      learned: this.learned,
      baseline: this.baseline,
      lifetimeReward: this.lifetimeReward,
      positiveEvents: this.positiveEvents,
      negativeEvents: this.negativeEvents,
      updates: this.updates,
      generation: this.generation,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Learning still works for the current session if storage is unavailable.
    }
  }
}
