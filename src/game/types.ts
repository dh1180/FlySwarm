export type FlyDecision = 'CHASE' | 'FLEE' | 'SWARM' | 'WANDER';

export type Genome = {
  aggression: number;
  fear: number;
  social: number;
  smell: number;
  speed: number;
};

export type FlyAgent = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  phase: number;
  genome: Genome;
  decision: FlyDecision;
};

export type Bullet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  damage: number;
  pierce: number;
  hit: Set<number>;
  critical: boolean;
};

export type Orb = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
};

export type Player = {
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  fireInterval: number;
  bulletSpeed: number;
  bulletCount: number;
  bulletSize: number;
  pierce: number;
  magnet: number;
  level: number;
  xp: number;
  xpNeed: number;
  critChance: number;
  critMultiplier: number;
  regen: number;
  armor: number;
  knockback: number;
  orbitalCount: number;
  orbitalDamage: number;
  novaInterval: number;
  novaTimer: number;
  novaDamage: number;
  xpGain: number;
  bossDamage: number;
  bulletLife: number;
  killHeal: number;
  auraDamage: number;
  auraRadius: number;
  chainChance: number;
  chainDamage: number;
  shield: number;
  shieldMax: number;
  shieldRegen: number;
  shieldCooldown: number;
  adrenaline: number;
};

export type UpgradeKey =
  | 'damage'
  | 'firerate'
  | 'multishot'
  | 'speed'
  | 'health'
  | 'pierce'
  | 'magnet'
  | 'bulletSpeed'
  | 'bulletSize'
  | 'crit'
  | 'regen'
  | 'armor'
  | 'knockback'
  | 'orbital'
  | 'nova'
  | 'xpGain'
  | 'bossDamage'
  | 'critPower'
  | 'leech'
  | 'toxinAura'
  | 'chain'
  | 'shield'
  | 'adrenaline'
  | 'bulletLife'
  | 'overclock';

export type UpgradeOption = {
  key: UpgradeKey;
  title: string;
  description: string;
  rarity: 'COMMON' | 'RARE' | 'NEURAL';
};

export type SelectedFly = {
  id: number;
  decision: FlyDecision;
  genome: Genome;
  hp: number;
  maxHp: number;
};

export type WholeBrainOutput = {
  turn: number;
  forward: number;
  backward: number;
  escape: number;
  stop: number;
  wing: number;
  activity: number;
  spikes: number;
};

export type WholeBrainSnapshot = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  progress: number;
  neurons: number;
  pairs: number;
  synapses: number;
  error: string | null;
  output: WholeBrainOutput;
};

export type DopamineHud = {
  generation: number;
  lifetimeReward: number;
  positiveEvents: number;
  negativeEvents: number;
  updates: number;
  baseline: number;
  exploration: number;
  recentReward: number;
  pretrainedEpisodes: number;
};

export type BossHud = {
  active: boolean;
  hp: number;
  maxHp: number;
  brain: WholeBrainSnapshot;
  dopamine: DopamineHud;
};

export type HudSnapshot = {
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpNeed: number;
  kills: number;
  wave: number;
  seconds: number;
  enemyCount: number;
  swarmGenome: Genome;
  selected: SelectedFly | null;
  boss: BossHud | null;
  connectome: WholeBrainSnapshot;
};

export type GameOverSnapshot = {
  kills: number;
  wave: number;
  seconds: number;
};
