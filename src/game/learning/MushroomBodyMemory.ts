import type {
  MushroomBodyHud,
  WholeBrainOutput,
} from '../types';

const KC_COUNT = 96;
const INPUT_COUNT = 10;
const ACTIVE_KC = 12;
const STORAGE_KEY = 'flyswarm:mushroom-body:v1';

type Projection = {
  indices: [number, number, number, number];
  gains: [number, number, number, number];
};

type SavedState = {
  version: 1;
  approachWeights: number[];
  avoidanceWeights: number[];
  updates: number;
  memoryStrength: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));

const seededRandom = (() => {
  let state = 0x51f15e1d >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xffffffff;
  };
})();

const projections: Projection[] = Array.from({ length: KC_COUNT }, () => {
  const pool = Array.from({ length: INPUT_COUNT }, (_, index) => index);
  const indices: number[] = [];
  while (indices.length < 4 && pool.length) {
    const pick = Math.floor(seededRandom() * pool.length);
    indices.push(pool.splice(pick, 1)[0]);
  }
  const gains = indices.map(() => 0.65 + seededRandom() * 0.7);
  return {
    indices: indices as Projection['indices'],
    gains: gains as Projection['gains'],
  };
});

export class MushroomBodyMemory {
  private readonly approachWeights = new Float32Array(KC_COUNT);
  private readonly avoidanceWeights = new Float32Array(KC_COUNT);
  private readonly kcActivity = new Float32Array(KC_COUNT);
  private readonly previousKcActivity = new Float32Array(KC_COUNT);

  private lastDan = 0;
  private approach = 0.5;
  private avoidance = 0.5;
  private novelty = 0;
  private updates = 0;
  private memoryStrength = 0;
  private saveTimer = 0;

  constructor() {
    this.initializePriors();
    this.restore();
  }

  evaluate(
    brain: WholeBrainOutput,
    projectileThreat: number,
    proximity: number,
    hpStress: number,
  ) {
    const input = [
      brain.turn,
      brain.forward,
      brain.backward,
      brain.escape,
      brain.stop,
      brain.wing,
      brain.activity,
      clamp(projectileThreat, 0, 1),
      clamp(proximity, 0, 1),
      clamp(hpStress, 0, 1),
    ];

    const raw = new Float32Array(KC_COUNT);
    const ranked: Array<{ index: number; value: number }> = [];

    for (let i = 0; i < KC_COUNT; i += 1) {
      const projection = projections[i];
      let sum = -0.28;
      for (let j = 0; j < 4; j += 1) {
        sum +=
          input[projection.indices[j]] *
          projection.gains[j];
      }
      const value = Math.max(0, Math.tanh(sum));
      raw[i] = value;
      ranked.push({ index: i, value });
    }

    ranked.sort((a, b) => b.value - a.value);
    this.kcActivity.fill(0);

    let approachSum = 0;
    let avoidanceSum = 0;
    let activeMass = 0;
    let noveltyMass = 0;

    for (let rank = 0; rank < ACTIVE_KC; rank += 1) {
      const { index, value } = ranked[rank];
      if (value <= 0) continue;

      this.kcActivity[index] = value;
      activeMass += value;
      approachSum += value * this.approachWeights[index];
      avoidanceSum += value * this.avoidanceWeights[index];
      noveltyMass +=
        Math.abs(value - this.previousKcActivity[index]);
    }

    const denom = Math.max(0.001, activeMass);
    this.approach = sigmoid((approachSum / denom) * 2.2);
    this.avoidance = sigmoid((avoidanceSum / denom) * 2.2);
    this.novelty = clamp(noveltyMass / Math.max(1, ACTIVE_KC), 0, 1);

    this.previousKcActivity.set(this.kcActivity);

    return {
      approach: this.approach,
      avoidance: this.avoidance,
      novelty: this.novelty,
      driveBias: clamp(
        (this.approach - this.avoidance) * 1.05,
        -0.65,
        0.65,
      ),
      vigilance: clamp(
        this.avoidance * 0.72 +
          this.novelty * 0.28,
        0,
        1,
      ),
    };
  }

  reward(value: number) {
    if (!Number.isFinite(value) || Math.abs(value) < 0.0001) return;

    const dan = clamp(value, -2.5, 2.5);
    this.lastDan = dan;
    const magnitude = Math.min(1.5, Math.abs(dan));
    const learningRate = 0.018;

    for (let i = 0; i < KC_COUNT; i += 1) {
      const kc = this.kcActivity[i];
      if (kc <= 0) continue;

      const delta = learningRate * magnitude * kc;
      if (dan > 0) {
        this.approachWeights[i] = clamp(
          this.approachWeights[i] + delta,
          -1.5,
          1.5,
        );
        this.avoidanceWeights[i] = clamp(
          this.avoidanceWeights[i] - delta * 0.45,
          -1.5,
          1.5,
        );
      } else {
        this.avoidanceWeights[i] = clamp(
          this.avoidanceWeights[i] + delta,
          -1.5,
          1.5,
        );
        this.approachWeights[i] = clamp(
          this.approachWeights[i] - delta * 0.35,
          -1.5,
          1.5,
        );
      }
    }

    this.updates += 1;
    this.memoryStrength = this.computeMemoryStrength();
    this.saveTimer += 1;
    if (this.saveTimer >= 8) {
      this.saveTimer = 0;
      this.save();
    }
  }

  resetEpisode() {
    this.kcActivity.fill(0);
    this.previousKcActivity.fill(0);
    this.lastDan = 0;
    this.approach = 0.5;
    this.avoidance = 0.5;
    this.novelty = 0;
  }

  getSnapshot(): MushroomBodyHud {
    return {
      approach: this.approach,
      avoidance: this.avoidance,
      novelty: this.novelty,
      dan: this.lastDan,
      updates: this.updates,
      memoryStrength: this.memoryStrength,
    };
  }

  private initializePriors() {
    for (let i = 0; i < KC_COUNT; i += 1) {
      const phase = (i / KC_COUNT) * Math.PI * 2;
      this.approachWeights[i] =
        Math.sin(phase * 3.1) * 0.07 +
        Math.cos(phase * 1.7) * 0.04;
      this.avoidanceWeights[i] =
        Math.cos(phase * 2.3) * 0.07 -
        Math.sin(phase * 1.9) * 0.04;
    }
    this.memoryStrength = this.computeMemoryStrength();
  }

  private computeMemoryStrength() {
    let total = 0;
    for (let i = 0; i < KC_COUNT; i += 1) {
      total +=
        Math.abs(this.approachWeights[i]) +
        Math.abs(this.avoidanceWeights[i]);
    }
    return total / (KC_COUNT * 2);
  }

  private restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedState;
      if (
        parsed.version !== 1 ||
        parsed.approachWeights.length !== KC_COUNT ||
        parsed.avoidanceWeights.length !== KC_COUNT
      ) {
        return;
      }

      for (let i = 0; i < KC_COUNT; i += 1) {
        this.approachWeights[i] = clamp(
          Number(parsed.approachWeights[i]) || 0,
          -1.5,
          1.5,
        );
        this.avoidanceWeights[i] = clamp(
          Number(parsed.avoidanceWeights[i]) || 0,
          -1.5,
          1.5,
        );
      }
      this.updates = Math.max(0, Number(parsed.updates) || 0);
      this.memoryStrength =
        Number(parsed.memoryStrength) ||
        this.computeMemoryStrength();
    } catch {
      // Corrupt memory falls back to the deterministic priors.
    }
  }

  private save() {
    const state: SavedState = {
      version: 1,
      approachWeights: Array.from(this.approachWeights),
      avoidanceWeights: Array.from(this.avoidanceWeights),
      updates: this.updates,
      memoryStrength: this.memoryStrength,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Current-session plasticity still works if storage is unavailable.
    }
  }
}
