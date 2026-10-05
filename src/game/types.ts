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
  pierce: number;
  magnet: number;
  level: number;
  xp: number;
  xpNeed: number;
};

export type UpgradeKey =
  | 'damage'
  | 'firerate'
  | 'multishot'
  | 'speed'
  | 'health'
  | 'pierce'
  | 'magnet';

export type UpgradeOption = {
  key: UpgradeKey;
  title: string;
  description: string;
};

export type SelectedFly = {
  id: number;
  decision: FlyDecision;
  genome: Genome;
  hp: number;
  maxHp: number;
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
};

export type GameOverSnapshot = {
  kills: number;
  wave: number;
  seconds: number;
};
