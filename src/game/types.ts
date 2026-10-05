export type FlyDecision = 'CHASE' | 'FLEE' | 'SWARM' | 'WANDER';
export type FlyKind = 'DRONE' | 'DARTER' | 'BRUTE' | 'SPITTER' | 'BOMBER';

export type Genome = {
  aggression: number;
  fear: number;
  social: number;
  smell: number;
  speed: number;
};

export type FlyAgent = {
  id: number;
  kind: FlyKind;
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
  attackCooldown: number;
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
  style?: 'NORMAL' | 'LANCE';
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
  manualLanceLevel: number;
  manualLanceCooldown: number;
  lightningLevel: number;
  lightningCooldown: number;
  fieldLevel: number;
  fieldTimer: number;
  meteorLevel: number;
  meteorTimer: number;
  ricochetLevel: number;
  executeLevel: number;
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
  | 'overclock'
  | 'manualLance'
  | 'targetLightning'
  | 'synapticField'
  | 'meteor'
  | 'ricochet'
  | 'execute';

export type EvolutionKey =
  | 'ganglionResonance'
  | 'vesicleSecretionHalo'
  | 'axonalSatellite'
  | 'synapticLattice'
  | 'glialOrbitalCascade'
  | 'depolarizationToxinBurst'
  | 'spikePropagation'
  | 'ganglionWavefront'
  | 'calciumWave'
  | 'venomAxon'
  | 'neuroglialMatrix'
  | 'hemolymphCascade'
  | 'axonMesh'
  | 'synapticBarrage'
  | 'glialCalciumStorm';

export type SkillKey = UpgradeKey | EvolutionKey;
export type SkillRarity = 'COMMON' | 'RARE' | 'NEURAL' | 'EVOLUTION';

export type UpgradeOption = {
  key: SkillKey;
  title: string;
  description: string;
  detail: string;
  rarity: SkillRarity;
  level: number;
  nextLevel: number;
  maxLevel: number;
  isEvolution?: boolean;
  requirements?: string[];
};

export type OwnedSkill = {
  key: SkillKey;
  title: string;
  level: number;
  maxLevel: number;
  rarity: SkillRarity;
  evolved?: boolean;
};

export type SelectedFly = {
  id: number;
  kind: FlyKind;
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
  kind: 'NEURAL_HUNTER' | 'STORM_BRAIN' | 'SWARM_QUEEN';
  name: string;
  hp: number;
  maxHp: number;
  brain: WholeBrainSnapshot;
  dopamine: DopamineHud;
};

export type AbilityHud = {
  autoLanceLevel: number;
  lightningLevel: number;
  lightningCooldown: number;
  lightningMaxCooldown: number;
  xpPickupRadius: number;
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
  abilities: AbilityHud;
  skills: OwnedSkill[];
  bossesDefeated: number;
  bossesTotal: number;
};

export type GameOverSnapshot = {
  kills: number;
  wave: number;
  seconds: number;
};

export type GameClearSnapshot = {
  kills: number;
  wave: number;
  seconds: number;
  bossesDefeated: number;
};

export type ChestRarity = 'COMMON' | 'RARE' | 'MYTHIC';
export type RewardSource =
  | 'LEVEL_UP'
  | 'CHEST_COMMON'
  | 'CHEST_RARE'
  | 'CHEST_MYTHIC'
  | 'FUSION_OFFER';

export type RewardContext = {
  source: RewardSource;
  title: string;
  subtitle: string;
};
