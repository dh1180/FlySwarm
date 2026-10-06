import { SpatialHash } from './SpatialHash';
import { WholeBrainController } from './connectome/WholeBrainController';
import { DopaminePolicy } from './learning/DopaminePolicy';
import { MushroomBodyMemory } from './learning/MushroomBodyMemory';
import type {
  Bullet,
  ChestRarity,
  FlyAgent,
  EvolutionKey,
  GameClearSnapshot,
  GameOverSnapshot,
  GameSoundEvent,
  Genome,
  HudSnapshot,
  Orb,
  OwnedSkill,
  Player,
  RewardContext,
  SelectedFly,
  SkillKey,
  SkillRarity,
  UpgradeKey,
  UpgradeOption,
} from './types';

const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 720;
const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1350;
const WAVE_SECONDS = 30;
const TAU = Math.PI * 2;
const BOSS_HIT_ID = -1;

type CoreBossKind =
  | 'NEURAL_HUNTER'
  | 'STORM_BRAIN'
  | 'SWARM_QUEEN'
  | 'GLIAL_TITAN'
  | 'CONNECTOME_APEX';

type BossKind = CoreBossKind | 'VIRTUAL_DROSOPHILA';

type Boss = {
  kind: BossKind;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  heading: number;
  pulseCooldown: number;
  specialCooldown: number;
  stage: number;
  damageScale: number;
  speedScale: number;
  cooldownScale: number;
  angularVelocity: number;
  turnHold: number;
  lastTurnSign: number;
  threatActive: boolean;
  threatPeak: number;
  dodgeRewardCooldown: number;
  isFinal: boolean;
  phase: number;
};

type EnemyShot = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  life: number;
  color: string;
  bossOwned: boolean;
};

type DamageField = {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  damage: number;
  pulseTimer: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};

type LightningFx = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  maxLife: number;
  color: string;
};

type BossStrike = {
  x: number;
  y: number;
  timer: number;
  maxTimer: number;
  radius: number;
  damage: number;
  color: string;
};

type RewardChest = {
  id: number;
  x: number;
  y: number;
  radius: number;
  rarity: ChestRarity;
  life: number;
  phase: number;
};

type RingFx = {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  startRadius: number;
  endRadius: number;
  color: string;
  lineWidth: number;
};

type UpgradeDefinition = {
  key: UpgradeKey;
  title: string;
  description: string;
  rarity: Exclude<SkillRarity, 'EVOLUTION'>;
  maxLevel: number;
};

type EvolutionDefinition = {
  key: EvolutionKey;
  title: string;
  description: string;
  detail: string;
  requirements: [UpgradeKey, UpgradeKey];
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const normalize = (x: number, y: number) => {
  const d = Math.hypot(x, y) || 1;
  return { x: x / d, y: y / d };
};

const randomRange = (min: number, max: number) =>
  min + Math.random() * (max - min);

const copyGenome = (g: Genome): Genome => ({ ...g });

const upgradeCatalog: UpgradeDefinition[] = [
  { key: 'damage', title: 'Synaptic Potentiation', description: '시냅스 전달 효율을 높여 기본 공격 피해를 강화', rarity: 'COMMON', maxLevel: 5 },
  { key: 'firerate', title: 'Sodium Channel Acceleration', description: '활동전위 발생 간격을 단축해 자동 공격 속도 강화', rarity: 'COMMON', maxLevel: 5 },
  { key: 'multishot', title: 'Axon Branching', description: '축삭 분지 수를 늘려 동시 발사 수 증가', rarity: 'RARE', maxLevel: 4 },
  { key: 'speed', title: 'Motor Neuron Recruitment', description: '운동 뉴런 동원을 높여 이동속도 강화', rarity: 'COMMON', maxLevel: 5 },
  { key: 'health', title: 'Chitin Homeostasis', description: '외골격 항상성 강화로 최대 체력과 즉시 회복 증가', rarity: 'COMMON', maxLevel: 5 },
  { key: 'pierce', title: 'Axonal Penetration', description: '축삭 신호 관통 능력 증가', rarity: 'RARE', maxLevel: 4 },
  { key: 'magnet', title: 'Chemotaxis Gradient', description: '화학주성 감지 범위를 넓혀 경험치 획득 반경 증가', rarity: 'COMMON', maxLevel: 5 },
  { key: 'bulletSpeed', title: 'Saltatory Conduction', description: '신호 전도 속도를 높여 투사체 속도 증가', rarity: 'COMMON', maxLevel: 5 },
  { key: 'bulletSize', title: 'Vesicle Hypertrophy', description: '소포 크기 증가로 투사체 크기 강화', rarity: 'COMMON', maxLevel: 4 },
  { key: 'crit', title: 'Spike Synchrony', description: '동기화된 신경 스파이크로 치명타 확률 증가', rarity: 'RARE', maxLevel: 5 },
  { key: 'regen', title: 'Tissue Homeostasis', description: '조직 항상성 회복으로 체력 재생 증가', rarity: 'RARE', maxLevel: 5 },
  { key: 'armor', title: 'Chitin Reinforcement', description: '키틴층 보강으로 받는 피해 감소', rarity: 'RARE', maxLevel: 5 },
  { key: 'knockback', title: 'Giant Fiber Reflex', description: '거대섬유 반사 회로로 적 넉백 증가', rarity: 'COMMON', maxLevel: 4 },
  { key: 'orbital', title: 'Synaptic Vesicle Orbit', description: '신경 소포 노드가 플레이어 주위를 회전하며 공격', rarity: 'NEURAL', maxLevel: 5 },
  { key: 'nova', title: 'Action Potential Burst', description: '주기적으로 활동전위 파동을 방출해 광역 피해', rarity: 'NEURAL', maxLevel: 5 },
  { key: 'xpGain', title: 'Memory Consolidation', description: '기억 고착 효율을 높여 경험치 획득량 증가', rarity: 'RARE', maxLevel: 5 },
  { key: 'bossDamage', title: 'Connectome Disruption', description: '복잡한 신경망 연결을 교란해 보스 피해 강화', rarity: 'NEURAL', maxLevel: 5 },
  { key: 'critPower', title: 'Spike Amplification', description: '고진폭 신경 스파이크로 치명타 피해 증가', rarity: 'RARE', maxLevel: 4 },
  { key: 'leech', title: 'Hemolymph Recycling', description: '처치 시 혈림프 재활용으로 체력 회복', rarity: 'RARE', maxLevel: 5 },
  { key: 'toxinAura', title: 'Neurotoxin Gradient', description: '주변에 신경독 농도 구배를 형성해 지속 피해', rarity: 'NEURAL', maxLevel: 5 },
  { key: 'chain', title: 'Gap Junction Cascade', description: '신호가 인접 표적으로 연쇄 전달될 확률 증가', rarity: 'NEURAL', maxLevel: 4 },
  { key: 'shield', title: 'Refractory Membrane', description: '불응기 막전위를 모사한 재생 보호막 강화', rarity: 'RARE', maxLevel: 5 },
  { key: 'adrenaline', title: 'Octopamine Surge', description: '곤충 신경조절물질 옥토파민으로 저체력 성능 강화', rarity: 'RARE', maxLevel: 4 },
  { key: 'bulletLife', title: 'Axon Extension', description: '축삭 연장으로 투사체 수명과 사거리 증가', rarity: 'COMMON', maxLevel: 4 },
  { key: 'overclock', title: 'Neuromodulator Overdrive', description: '신경조절물질 과활성으로 공격·공속·이속 복합 강화', rarity: 'NEURAL', maxLevel: 4 },
  { key: 'manualLance', title: 'Axonal Spike', description: '가장 가까운 적을 향해 자동 관통 스파이크 발사', rarity: 'NEURAL', maxLevel: 5 },
  { key: 'synapticField', title: 'Glial Matrix', description: '가장 가까운 적 중심에 지속 피해 글리아성 미세환경 형성', rarity: 'NEURAL', maxLevel: 5 },
  { key: 'meteor', title: 'Calcium Cascade', description: '표적 위치에 칼슘 신호 폭주를 일으켜 광역 피해', rarity: 'NEURAL', maxLevel: 5 },
  { key: 'ricochet', title: 'Recurrent Circuit', description: '재귀 회로처럼 추가 투사체가 주변 적으로 재전달', rarity: 'RARE', maxLevel: 5 },
  { key: 'execute', title: 'Apoptotic Threshold', description: '저체력 적의 세포사멸 임계점을 이용해 추가 피해', rarity: 'RARE', maxLevel: 5 },
];

const evolutionCatalog: EvolutionDefinition[] = [
  { key: 'ganglionResonance', title: 'GANGLION RESONANCE', description: 'Synaptic Vesicle Orbit + Action Potential Burst', detail: '회전 노드가 Nova와 공명해 Burst 범위와 오비탈 피해가 함께 증폭됩니다.', requirements: ['orbital', 'nova'] },
  { key: 'vesicleSecretionHalo', title: 'VESICLE SECRETION HALO', description: 'Synaptic Vesicle Orbit + Neurotoxin Gradient', detail: '회전 소포가 신경독을 확산시켜 오비탈 주변에 독성 피해를 동반합니다.', requirements: ['orbital', 'toxinAura'] },
  { key: 'axonalSatellite', title: 'AXONAL SATELLITE', description: 'Synaptic Vesicle Orbit + Axonal Spike', detail: '오비탈 노드가 축삭 스파이크를 보조하고 Spike의 관통·속도·충격 범위를 강화합니다.', requirements: ['orbital', 'manualLance'] },
  { key: 'synapticLattice', title: 'SYNAPTIC LATTICE', description: 'Synaptic Vesicle Orbit + Glial Matrix', detail: '오비탈 노드와 글리아 장판이 연결되어 Matrix DPS와 오비탈 피해가 함께 증가합니다.', requirements: ['orbital', 'synapticField'] },
  { key: 'glialOrbitalCascade', title: 'GLIAL ORBITAL CASCADE', description: 'Synaptic Vesicle Orbit + Calcium Cascade', detail: '칼슘 폭주가 오비탈 노드를 자극해 추가 충격파와 오비탈 증폭을 발생시킵니다.', requirements: ['orbital', 'meteor'] },
  { key: 'depolarizationToxinBurst', title: 'DEPOLARIZATION TOXIN BURST', description: 'Action Potential Burst + Neurotoxin Gradient', detail: '활동전위 Burst가 신경독 구배를 순간 증폭해 넓은 독성 파동을 만듭니다.', requirements: ['nova', 'toxinAura'] },
  { key: 'spikePropagation', title: 'SPIKE PROPAGATION', description: 'Action Potential Burst + Axonal Spike', detail: 'Axonal Spike가 적중 지점에서 소형 활동전위 Burst를 유발합니다.', requirements: ['nova', 'manualLance'] },
  { key: 'ganglionWavefront', title: 'GANGLION WAVEFRONT', description: 'Action Potential Burst + Glial Matrix', detail: 'Burst가 지나간 자리에 글리아 Matrix를 남겨 광역 피해와 지속 피해를 연결합니다.', requirements: ['nova', 'synapticField'] },
  { key: 'calciumWave', title: 'CALCIUM WAVE', description: 'Action Potential Burst + Calcium Cascade', detail: '칼슘 폭주 충격이 추가 Burst를 발생시켜 이중 광역 파동을 만듭니다.', requirements: ['nova', 'meteor'] },
  { key: 'venomAxon', title: 'VENOM AXON', description: 'Neurotoxin Gradient + Axonal Spike', detail: 'Axonal Spike가 진행 경로와 표적 지점에 신경독성 손상을 남깁니다.', requirements: ['toxinAura', 'manualLance'] },
  { key: 'neuroglialMatrix', title: 'NEUROGLIAL MATRIX', description: 'Neurotoxin Gradient + Glial Matrix', detail: '글리아 Matrix가 신경독 저장소가 되어 장판 DPS와 범위를 크게 강화합니다.', requirements: ['toxinAura', 'synapticField'] },
  { key: 'hemolymphCascade', title: 'HEMOLYMPH CASCADE', description: 'Neurotoxin Gradient + Calcium Cascade', detail: '칼슘 폭주가 독성 미세환경을 남겨 폭발 이후에도 지속 피해를 줍니다.', requirements: ['toxinAura', 'meteor'] },
  { key: 'axonMesh', title: 'AXON MESH', description: 'Axonal Spike + Glial Matrix', detail: 'Spike가 적중 지점마다 짧은 글리아 Matrix를 생성해 관통 공격과 장판을 결합합니다.', requirements: ['manualLance', 'synapticField'] },
  { key: 'synapticBarrage', title: 'SYNAPTIC BARRAGE', description: 'Axonal Spike + Calcium Cascade', detail: '칼슘 폭주 지점에서 방사형 Axonal Spike가 발사되어 광역 폭발과 관통탄을 결합합니다.', requirements: ['manualLance', 'meteor'] },
  { key: 'glialCalciumStorm', title: 'GLIAL CALCIUM STORM', description: 'Glial Matrix + Calcium Cascade', detail: 'Matrix 내부에서 반복적인 칼슘 폭주가 발생하고 Cascade의 범위와 충격이 강화됩니다.', requirements: ['synapticField', 'meteor'] },
];

const offensiveSkillKeys: UpgradeKey[] = [
  'orbital',
  'nova',
  'toxinAura',
  'manualLance',
  'synapticField',
  'meteor',
];

const fusionRuntimeCoverage: Record<EvolutionKey, true> = {
  ganglionResonance: true,
  vesicleSecretionHalo: true,
  axonalSatellite: true,
  synapticLattice: true,
  glialOrbitalCascade: true,
  depolarizationToxinBurst: true,
  spikePropagation: true,
  ganglionWavefront: true,
  calciumWave: true,
  venomAxon: true,
  neuroglialMatrix: true,
  hemolymphCascade: true,
  axonMesh: true,
  synapticBarrage: true,
  glialCalciumStorm: true,
};

const validateFusionCatalog = () => {
  const pairKey = (a: UpgradeKey, b: UpgradeKey) =>
    [a, b].sort().join('::');

  const recipeKeys = new Set<string>();
  const evolutionKeys = new Set<EvolutionKey>();

  for (const evolution of evolutionCatalog) {
    if (!fusionRuntimeCoverage[evolution.key]) {
      throw new Error(`Missing runtime coverage for ${evolution.key}`);
    }
    if (evolutionKeys.has(evolution.key)) {
      throw new Error(`Duplicate fusion key: ${evolution.key}`);
    }
    evolutionKeys.add(evolution.key);

    const [a, b] = evolution.requirements;
    if (a === b) {
      throw new Error(`Fusion cannot reuse the same source: ${evolution.key}`);
    }
    const pair = pairKey(a, b);
    if (recipeKeys.has(pair)) {
      throw new Error(`Duplicate fusion recipe: ${pair}`);
    }
    recipeKeys.add(pair);
  }

  const expectedPairs =
    (offensiveSkillKeys.length * (offensiveSkillKeys.length - 1)) / 2;
  if (evolutionCatalog.length !== expectedPairs) {
    throw new Error(
      `Fusion catalog must cover all pairs: expected ${expectedPairs}, got ${evolutionCatalog.length}`,
    );
  }

  for (let i = 0; i < offensiveSkillKeys.length; i += 1) {
    for (let j = i + 1; j < offensiveSkillKeys.length; j += 1) {
      const pair = pairKey(
        offensiveSkillKeys[i],
        offensiveSkillKeys[j],
      );
      if (!recipeKeys.has(pair)) {
        throw new Error(`Missing fusion recipe: ${pair}`);
      }
    }
  }
};

validateFusionCatalog();

type Callbacks = {
  onHud: (hud: HudSnapshot) => void;
  onLevelUp: (options: UpgradeOption[], context: RewardContext) => void;
  onGameOver: (result: GameOverSnapshot) => void;
  onGameClear: (result: GameClearSnapshot) => void;
  onSound: (event: GameSoundEvent) => void;
};

export class GameEngine {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly spatial = new SpatialHash(76);
  private readonly keys = new Set<string>();
  private readonly callbacks: Callbacks;
  private readonly brain = new WholeBrainController();
  private readonly dopamine = new DopaminePolicy();
  private readonly mushroomBody = new MushroomBodyMemory();

  private raf = 0;
  private running = false;
  private pausedForUpgrade = false;
  private gameOver = false;
  private gameCleared = false;
  private finalBossPending = false;
  private finalBossCountdown = 0;
  private finalBossDefeated = false;
  private finalMemoryDriveBias = 0;
  private finalMemoryVigilance = 0;
  private last = 0;
  private time = 0;
  private hudTimer = 0;
  private spawnTimer = 0;
  private shootTimer = 0;
  private evolutionBanner = 0;
  private novaFlash = 0;
  private bossPulseFlash = 0;
  private wave = 1;
  private kills = 0;
  private flyId = 1;
  private chestId = 1;
  private selectedId: number | null = null;
  private nextBossWave = 3;
  private bossBrainTimer = 0;
  private bossPolicyTurn = 0;
  private bossPolicyDrive = 0;
  private bossRewardBuffer = 0;
  private bossPenaltyBuffer = 0;
  private bossIndex = 0;
  private aimX = WORLD_WIDTH / 2 + 1;
  private aimY = WORLD_HEIGHT / 2;
  private lastMoveX = 1;
  private lastMoveY = 0;
  private screenShake = 0;
  private damageFlash = 0;
  private touchMoveX = 0;
  private touchMoveY = 0;

  private player: Player = this.makePlayer();
  private flies: FlyAgent[] = [];
  private bullets: Bullet[] = [];
  private orbs: Orb[] = [];
  private chests: RewardChest[] = [];
  private bossStrikes: BossStrike[] = [];
  private enemyShots: EnemyShot[] = [];
  private damageFields: DamageField[] = [];
  private particles: Particle[] = [];
  private lightningFx: LightningFx[] = [];
  private ringFx: RingFx[] = [];
  private boss: Boss | null = null;
  private readonly defeatedBosses = new Set<CoreBossKind>();
  private readonly upgradeLevels: Partial<Record<UpgradeKey, number>> = {};
  private readonly evolvedSkills = new Set<EvolutionKey>();
  private readonly fusedSourceSkills = new Set<UpgradeKey>();
  private orbitalPulseTimer = 0;
  private ownedSkillOrder: SkillKey[] = [];
  private swarmGenome: Genome = {
    aggression: 0.56,
    fear: 0.35,
    social: 0.52,
    smell: 0.62,
    speed: 0.5,
  };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    callbacks: Callbacks,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context is not available.');
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.canvas.width = VIEW_WIDTH;
    this.canvas.height = VIEW_HEIGHT;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('click', this.onCanvasClick);
    canvas.addEventListener('mousemove', this.onCanvasMove);
    canvas.addEventListener('contextmenu', this.onContextMenu);
    canvas.addEventListener('touchstart', this.onCanvasTouch, { passive: false });
    canvas.addEventListener('touchmove', this.onCanvasTouch, { passive: false });
    this.emitHud();
    this.render();
  }

  start() {
    if (this.running) return;
    this.brain.load();
    this.running = true;
    this.gameOver = false;
    this.gameCleared = false;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  restart() {
    this.player = this.makePlayer();
    this.flies = [];
    this.bullets = [];
    this.orbs = [];
    this.chests = [];
    this.bossStrikes = [];
    this.enemyShots = [];
    this.damageFields = [];
    this.particles = [];
    this.lightningFx = [];
    this.ringFx = [];
    this.boss = null;
    this.time = 0;
    this.hudTimer = 0;
    this.spawnTimer = 0;
    this.shootTimer = 0;
    this.evolutionBanner = 0;
    this.novaFlash = 0;
    this.bossPulseFlash = 0;
    this.wave = 1;
    this.kills = 0;
    this.flyId = 1;
    this.chestId = 1;
    this.selectedId = null;
    this.nextBossWave = 3;
    this.bossBrainTimer = 0;
    this.bossPolicyTurn = 0;
    this.bossPolicyDrive = 0;
    this.bossRewardBuffer = 0;
    this.bossPenaltyBuffer = 0;
    this.bossIndex = 0;
    this.aimX = WORLD_WIDTH / 2 + 1;
    this.aimY = WORLD_HEIGHT / 2;
    this.lastMoveX = 1;
    this.lastMoveY = 0;
    this.screenShake = 0;
    this.damageFlash = 0;
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    this.pausedForUpgrade = false;
    this.gameOver = false;
    this.gameCleared = false;
    this.finalBossPending = false;
    this.finalBossCountdown = 0;
    this.finalBossDefeated = false;
    this.finalMemoryDriveBias = 0;
    this.finalMemoryVigilance = 0;
    this.mushroomBody.resetEpisode();
    this.defeatedBosses.clear();
    for (const key of Object.keys(this.upgradeLevels) as UpgradeKey[]) {
      delete this.upgradeLevels[key];
    }
    this.evolvedSkills.clear();
    this.fusedSourceSkills.clear();
    this.orbitalPulseTimer = 0;
    this.ownedSkillOrder = [];
    this.swarmGenome = {
      aggression: 0.56,
      fear: 0.35,
      social: 0.52,
      smell: 0.62,
      speed: 0.5,
    };
    this.brain.load();
    this.brain.reset();
    if (!this.running) {
      this.running = true;
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    }
    this.emitHud();
  }

  applyUpgrade(key: SkillKey) {
    if (this.isEvolutionKey(key)) {
      const evolution = evolutionCatalog.find((item) => item.key === key);
      if (
        !evolution ||
        this.evolvedSkills.has(key) ||
        !this.canEvolve(evolution)
      ) {
        this.pausedForUpgrade = false;
        return;
      }

      this.evolvedSkills.add(key);
      for (const source of evolution.requirements) {
        this.fusedSourceSkills.add(source);
      }
      this.ownedSkillOrder.push(key);
      this.spawnRing(
        this.player.x,
        this.player.y,
        20,
        260,
        '#ffffff',
        0.7,
        8,
      );
      this.spawnParticles(this.player.x, this.player.y, '#ffffff', 42, 220);
      this.screenShake = Math.max(this.screenShake, 13);
      this.callbacks.onSound('fusion');
      this.pausedForUpgrade = false;
      this.emitHud();
      return;
    }

    const definition = upgradeCatalog.find((item) => item.key === key);
    if (!definition) {
      this.pausedForUpgrade = false;
      return;
    }

    const currentLevel = this.getUpgradeLevel(key);
    if (currentLevel >= definition.maxLevel) {
      this.pausedForUpgrade = false;
      return;
    }

    const nextLevel = currentLevel + 1;
    this.upgradeLevels[key] = nextLevel;
    if (currentLevel === 0) this.ownedSkillOrder.push(key);

    switch (key) {
      case 'damage':
        this.player.damage *= 1.25;
        break;
      case 'firerate':
        this.player.fireInterval = Math.max(
          0.07,
          this.player.fireInterval * 0.82,
        );
        break;
      case 'multishot':
        this.player.bulletCount = Math.min(9, this.player.bulletCount + 1);
        break;
      case 'speed':
        this.player.speed *= 1.12;
        break;
      case 'health':
        this.player.maxHp += 25;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 38);
        break;
      case 'pierce':
        this.player.pierce += 1;
        break;
      case 'magnet':
        this.player.magnet += 35;
        break;
      case 'bulletSpeed':
        this.player.bulletSpeed *= 1.2;
        break;
      case 'bulletSize':
        this.player.bulletSize += 1.2;
        break;
      case 'crit':
        this.player.critChance = Math.min(
          0.52,
          this.player.critChance + 0.08,
        );
        break;
      case 'regen':
        this.player.regen += 0.65;
        break;
      case 'armor':
        this.player.armor = Math.min(0.45, this.player.armor + 0.05);
        break;
      case 'knockback':
        this.player.knockback += 22;
        break;
      case 'orbital':
        this.player.orbitalCount = Math.min(
          7,
          this.player.orbitalCount + (nextLevel === 1 ? 2 : 1),
        );
        this.player.orbitalDamage += nextLevel === 1 ? 4 : 3;
        break;
      case 'nova':
        if (this.player.novaInterval <= 0) {
          this.player.novaInterval = 7;
          this.player.novaDamage = 58;
          this.player.novaTimer = 0;
        } else {
          this.player.novaInterval = Math.max(
            2.6,
            this.player.novaInterval * 0.86,
          );
          this.player.novaDamage *= 1.22;
        }
        break;
      case 'xpGain':
        this.player.xpGain += 0.25;
        break;
      case 'bossDamage':
        this.player.bossDamage *= 1.25;
        break;
      case 'critPower':
        this.player.critMultiplier += 0.45;
        break;
      case 'leech':
        this.player.killHeal += 0.8;
        break;
      case 'toxinAura':
        if (this.player.auraDamage <= 0) {
          this.player.auraDamage = 14;
          this.player.auraRadius = 105;
        } else {
          this.player.auraDamage *= 1.24;
          this.player.auraRadius += 12;
        }
        break;
      case 'chain':
        this.player.chainChance = Math.min(
          0.72,
          this.player.chainChance + 0.18,
        );
        this.player.chainDamage = Math.min(
          0.8,
          Math.max(0.32, this.player.chainDamage + 0.08),
        );
        break;
      case 'shield':
        this.player.shieldMax += 22;
        this.player.shield = this.player.shieldMax;
        this.player.shieldRegen += 2.4;
        break;
      case 'adrenaline':
        this.player.adrenaline = Math.min(4, this.player.adrenaline + 1);
        break;
      case 'bulletLife':
        this.player.bulletLife *= 1.3;
        break;
      case 'overclock':
        this.player.damage *= 1.14;
        this.player.fireInterval = Math.max(
          0.07,
          this.player.fireInterval * 0.9,
        );
        this.player.speed *= 1.06;
        break;
      case 'manualLance':
        this.player.manualLanceLevel = Math.min(
          5,
          this.player.manualLanceLevel + 1,
        );
        break;
      case 'targetLightning':
        this.player.lightningLevel = Math.min(
          5,
          this.player.lightningLevel + 1,
        );
        break;
      case 'synapticField':
        this.player.fieldLevel = Math.min(5, this.player.fieldLevel + 1);
        this.player.fieldTimer = 0;
        break;
      case 'meteor':
        this.player.meteorLevel = Math.min(5, this.player.meteorLevel + 1);
        this.player.meteorTimer = 0;
        break;
      case 'ricochet':
        this.player.ricochetLevel = Math.min(
          5,
          this.player.ricochetLevel + 1,
        );
        break;
      case 'execute':
        this.player.executeLevel = Math.min(
          5,
          this.player.executeLevel + 1,
        );
        break;
    }

    this.callbacks.onSound('upgrade');

    const immediateFusions =
      nextLevel >= definition.maxLevel && offensiveSkillKeys.includes(key)
        ? evolutionCatalog
            .filter(
              (evolution) =>
                !this.evolvedSkills.has(evolution.key) &&
                evolution.requirements.includes(key) &&
                this.canEvolve(evolution),
            )
            .map((evolution) => this.buildEvolutionOption(evolution))
        : [];

    if (immediateFusions.length) {
      this.pausedForUpgrade = true;
      this.callbacks.onSound('fusionReady');
      this.callbacks.onLevelUp(immediateFusions, {
        source: 'FUSION_OFFER',
        title: 'SYNAPTIC FUSION',
        subtitle: 'TWO MAXIMUM CIRCUITS CAN MERGE',
      });
    } else {
      this.pausedForUpgrade = false;
    }
    this.emitHud();
  }

  cancelFusionOffer() {
    this.pausedForUpgrade = false;
    this.emitHud();
  }

  private getUpgradeLevel(key: UpgradeKey) {
    return this.upgradeLevels[key] ?? 0;
  }

  private isEvolutionKey(key: SkillKey): key is EvolutionKey {
    return evolutionCatalog.some((item) => item.key === key);
  }

  private canEvolve(evolution: EvolutionDefinition) {
    return evolution.requirements.every((key) => {
      const definition = upgradeCatalog.find((item) => item.key === key);
      return (
        definition !== undefined &&
        this.getUpgradeLevel(key) >= definition.maxLevel &&
        !this.fusedSourceSkills.has(key)
      );
    });
  }

  private fusionCountFor(key: UpgradeKey) {
    return evolutionCatalog.filter(
      (evolution) =>
        this.evolvedSkills.has(evolution.key) &&
        evolution.requirements.includes(key),
    ).length;
  }

  private getUpgradeDetail(key: UpgradeKey, nextLevel: number) {
    switch (key) {
      case 'damage':
        return `Lv ${nextLevel}: 기본 투사체 피해 ×1.25`;
      case 'firerate':
        return `Lv ${nextLevel}: 자동 공격 간격 ×0.82 (약 22% 빠름)`;
      case 'multishot':
        return `Lv ${nextLevel}: 동시 발사 투사체 +1`;
      case 'speed':
        return `Lv ${nextLevel}: 이동속도 ×1.12`;
      case 'health':
        return `Lv ${nextLevel}: 최대 HP +25 / 즉시 HP +38`;
      case 'pierce':
        return `Lv ${nextLevel}: 기본 투사체 관통 +1`;
      case 'magnet':
        return `Lv ${nextLevel}: XP 즉시 획득 반경 +35`;
      case 'bulletSpeed':
        return `Lv ${nextLevel}: 투사체 속도 ×1.20`;
      case 'bulletSize':
        return `Lv ${nextLevel}: 투사체 반경 +1.2`;
      case 'crit':
        return `Lv ${nextLevel}: 치명타 확률 +8%p`;
      case 'regen':
        return `Lv ${nextLevel}: 초당 체력 재생 +0.65`;
      case 'armor':
        return `Lv ${nextLevel}: 받는 피해 5%p 감소`;
      case 'knockback':
        return `Lv ${nextLevel}: 넉백 +22`;
      case 'orbital':
        return nextLevel === 1
          ? 'Lv 1: 오비탈 2개 해금 / 기본 피해 18 / 회전속도 강화'
          : `Lv ${nextLevel}: 오비탈 +1 / 오비탈 피해 +3 / 접촉 판정 강화`;
      case 'nova':
        return nextLevel === 1
          ? 'Lv 1: 7초마다 반경 220, 피해 58 Nova 해금'
          : `Lv ${nextLevel}: Nova 주기 ×0.86 / 피해 ×1.22`;
      case 'xpGain':
        return `Lv ${nextLevel}: 경험치 획득 배율 +0.25`;
      case 'bossDamage':
        return `Lv ${nextLevel}: 보스 대상 피해 ×1.25`;
      case 'critPower':
        return `Lv ${nextLevel}: 치명타 피해 배율 +0.45`;
      case 'leech':
        return `Lv ${nextLevel}: 일반 적 처치 회복 +0.8 HP`;
      case 'toxinAura':
        return nextLevel === 1
          ? 'Lv 1: 반경 105 / DPS 14 독성 오라 해금'
          : `Lv ${nextLevel}: 오라 DPS ×1.24 / 반경 +12`;
      case 'chain':
        return `Lv ${nextLevel}: 연쇄 발동률 +18%p / 연쇄 피해 배율 +0.08`;
      case 'shield':
        return `Lv ${nextLevel}: 보호막 최대치 +22 / 재생 +2.4/s`;
      case 'adrenaline':
        return `Lv ${nextLevel}: HP 35% 이하 이속 +14%, 공속 +18% 추가`;
      case 'bulletLife':
        return `Lv ${nextLevel}: 투사체 수명 ×1.30`;
      case 'overclock':
        return `Lv ${nextLevel}: 피해 ×1.14 / 공격간격 ×0.90 / 이속 ×1.06`;
      case 'manualLance': {
        const cooldown = Math.max(0.38, 1.22 - nextLevel * 0.12);
        const damage = 2.05 + nextLevel * 0.46;
        const pierce = 5 + nextLevel * 2;
        return `Lv ${nextLevel}: 자동 Lance 피해 ×${damage.toFixed(2)}, 관통 ${pierce}, 주기 ${cooldown.toFixed(2)}s`;
      }
      case 'targetLightning': {
        const cooldown = Math.max(1.8, 5.7 - nextLevel * 0.62);
        const radius = 88 + nextLevel * 13;
        return `Lv ${nextLevel}: 낙뢰 기본피해 ${72 + nextLevel * 34}+공격력×0.9 / 반경 ${radius} / 쿨 ${cooldown.toFixed(2)}s`;
      }
      case 'synapticField':
        return `Lv ${nextLevel}: 장판 DPS ${14 + nextLevel * 7} / 반경 ${82 + nextLevel * 10} / 지속 ${(4.5 + nextLevel * 0.45).toFixed(1)}s`;
      case 'meteor':
        return `Lv ${nextLevel}: Meteor 피해 ${66 + nextLevel * 30} / 반경 ${112 + nextLevel * 12} / 주기 ${Math.max(3.8, 7.3 - nextLevel * 0.55).toFixed(2)}s`;
      case 'ricochet':
        return `Lv ${nextLevel}: 튕김 확률 ${12 + nextLevel * 6}% / 피해 ${35 + nextLevel * 8}%`;
      case 'execute':
        return `Lv ${nextLevel}: HP ${(12 + nextLevel * 3.5).toFixed(1)}% 이하 적에게 추가 피해 ${42 + nextLevel * 12}%`;
    }
    return '';
  }

  private buildUpgradeOption(definition: UpgradeDefinition): UpgradeOption {
    const level = this.getUpgradeLevel(definition.key);
    const nextLevel = Math.min(definition.maxLevel, level + 1);
    return {
      key: definition.key,
      title: definition.title,
      description: definition.description,
      detail: this.getUpgradeDetail(definition.key, nextLevel),
      rarity: definition.rarity,
      level,
      nextLevel,
      maxLevel: definition.maxLevel,
    };
  }

  private buildEvolutionOption(
    evolution: EvolutionDefinition,
  ): UpgradeOption {
    return {
      key: evolution.key,
      title: evolution.title,
      description: evolution.description,
      detail: evolution.detail,
      rarity: 'EVOLUTION',
      level: 0,
      nextLevel: 1,
      maxLevel: 1,
      isEvolution: true,
      requirements: evolution.requirements.map((key) => {
        const definition = upgradeCatalog.find((item) => item.key === key);
        return definition?.title ?? key;
      }),
    };
  }

  private getOwnedSkills(): OwnedSkill[] {
    return this.ownedSkillOrder.reduce<OwnedSkill[]>((skills, key) => {
      if (this.isEvolutionKey(key)) {
        const evolution = evolutionCatalog.find((item) => item.key === key);
        if (evolution && this.evolvedSkills.has(key)) {
          skills.push({
            key,
            title: evolution.title,
            level: 1,
            maxLevel: 1,
            rarity: 'EVOLUTION',
            evolved: true,
          });
        }
        return skills;
      }

      const definition = upgradeCatalog.find((item) => item.key === key);
      const level = this.getUpgradeLevel(key);
      if (definition && level > 0) {
        const fusedEvolution = evolutionCatalog.find(
          (evolution) =>
            this.evolvedSkills.has(evolution.key) &&
            evolution.requirements.includes(key),
        );
        skills.push({
          key,
          title: definition.title,
          level,
          maxLevel: definition.maxLevel,
          rarity: definition.rarity,
          evolved: false,
          fusionLocked: Boolean(fusedEvolution),
          fusedInto: fusedEvolution?.title,
        });
      }
      return skills;
    }, []);
  }

  setTouchMove(x: number, y: number) {
    const length = Math.hypot(x, y);
    if (length > 1) {
      this.touchMoveX = x / length;
      this.touchMoveY = y / length;
    } else {
      this.touchMoveX = x;
      this.touchMoveY = y;
    }
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.brain.destroy();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('click', this.onCanvasClick);
    this.canvas.removeEventListener('mousemove', this.onCanvasMove);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.canvas.removeEventListener('touchstart', this.onCanvasTouch);
    this.canvas.removeEventListener('touchmove', this.onCanvasTouch);
  }

  private makePlayer(): Player {
    return {
      x: WORLD_WIDTH / 2,
      y: WORLD_HEIGHT / 2,
      radius: 10,
      hp: 100,
      maxHp: 100,
      speed: 250,
      damage: 24,
      fireInterval: 0.34,
      bulletSpeed: 650,
      bulletCount: 1,
      bulletSize: 4.5,
      pierce: 0,
      magnet: 115,
      level: 1,
      xp: 0,
      xpNeed: 9,
      critChance: 0.05,
      critMultiplier: 2,
      regen: 0,
      armor: 0,
      knockback: 12,
      orbitalCount: 0,
      orbitalDamage: 14,
      novaInterval: 0,
      novaTimer: 0,
      novaDamage: 0,
      xpGain: 1,
      bossDamage: 1,
      bulletLife: 1.35,
      killHeal: 0,
      auraDamage: 0,
      auraRadius: 0,
      chainChance: 0,
      chainDamage: 0,
      shield: 0,
      shieldMax: 0,
      shieldRegen: 0,
      shieldCooldown: 0,
      adrenaline: 0,
      manualLanceLevel: 0,
      manualLanceCooldown: 0,
      lightningLevel: 0,
      lightningCooldown: 0,
      fieldLevel: 0,
      fieldTimer: 0,
      meteorLevel: 0,
      meteorTimer: 0,
      ricochetLevel: 0,
      executeLevel: 0,
    };
  }

  private loop = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.033, (now - this.last) / 1000);
    this.last = now;

    if (!this.pausedForUpgrade && !this.gameOver && !this.gameCleared) {
      this.update(dt);
    }
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    this.time += dt;
    this.hudTimer += dt;
    this.spawnTimer += dt;
    this.shootTimer += dt;
    this.evolutionBanner = Math.max(0, this.evolutionBanner - dt);
    this.novaFlash = Math.max(0, this.novaFlash - dt);
    this.bossPulseFlash = Math.max(0, this.bossPulseFlash - dt);
    this.screenShake = Math.max(0, this.screenShake - dt * 30);
    this.damageFlash = Math.max(0, this.damageFlash - dt);
    this.player.manualLanceCooldown = Math.max(
      0,
      this.player.manualLanceCooldown - dt,
    );
    if (
      this.player.manualLanceLevel > 0 &&
      this.player.manualLanceCooldown <= 0
    ) {
      this.castAutoLance();
    }
    this.player.lightningCooldown = Math.max(
      0,
      this.player.lightningCooldown - dt,
    );

    if (
      !this.finalBossPending &&
      !this.boss?.isFinal &&
      !this.finalBossDefeated
    ) {
      const nextWave = Math.floor(this.time / WAVE_SECONDS) + 1;
      if (nextWave > this.wave) {
        this.wave = nextWave;
        this.evolveSwarm();
      }
    }

    const brainSnapshot = this.brain.getSnapshot();

    if (this.finalBossPending) {
      this.finalBossCountdown = Math.max(
        0,
        this.finalBossCountdown - dt,
      );
      if (
        this.finalBossCountdown <= 0 &&
        brainSnapshot.status === 'ready'
      ) {
        this.spawnFinalBoss();
      }
    }

    if (
      !this.boss &&
      !this.finalBossPending &&
      !this.finalBossDefeated &&
      this.defeatedBosses.size < 5 &&
      this.wave >= this.nextBossWave &&
      brainSnapshot.status === 'ready'
    ) {
      this.spawnBoss();
    }

    this.updatePlayer(dt);
    this.spawnFlies();
    this.spatial.rebuild(this.flies);
    this.updateFlies(dt);
    this.updateBoss(dt);
    this.updateBossStrikes(dt);
    this.updateEnemyShots(dt);
    this.spatial.rebuild(this.flies);

    if (!this.finalBossPending) {
      this.updateShooting();
      this.updateBullets(dt);
      this.updateAbilities(dt);
      this.updateDamageFields(dt);
    } else {
      this.bullets = [];
      this.damageFields = [];
    }

    this.updateChests(dt);
    this.updateOrbs(dt);
    this.updateVfx(dt);

    this.flies = this.flies.filter((fly) => fly.hp > 0);
    this.bullets = this.bullets.filter((bullet) => bullet.life > 0);
    this.enemyShots = this.enemyShots.filter((shot) => shot.life > 0);
    this.damageFields = this.damageFields.filter((field) => field.life > 0);
    this.particles = this.particles.filter((particle) => particle.life > 0);
    this.lightningFx = this.lightningFx.filter((fx) => fx.life > 0);
    this.ringFx = this.ringFx.filter((fx) => fx.life > 0);
    this.chests = this.chests.filter((chest) => chest.life > 0);

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.gameOver = true;
      this.callbacks.onSound('gameOver');
      this.callbacks.onGameOver({
        kills: this.kills,
        wave: this.wave,
        seconds: this.time,
      });
    }

    if (this.hudTimer >= 0.12) {
      this.hudTimer = 0;
      this.emitHud();
    }
  }

  private updatePlayer(dt: number) {
    let dx = 0;
    let dy = 0;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) dy -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) dy += 1;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) dx -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) dx += 1;

    if (Math.abs(this.touchMoveX) > 0.02 || Math.abs(this.touchMoveY) > 0.02) {
      dx = this.touchMoveX;
      dy = this.touchMoveY;
    }

    const lowHpAdrenaline =
      this.player.hp / this.player.maxHp < 0.35
        ? 1 + this.player.adrenaline * 0.14
        : 1;

    if (dx || dy) {
      const n = normalize(dx, dy);
      this.lastMoveX = n.x;
      this.lastMoveY = n.y;
      this.player.x += n.x * this.player.speed * lowHpAdrenaline * dt;
      this.player.y += n.y * this.player.speed * lowHpAdrenaline * dt;
    }

    if (this.player.shieldMax > 0) {
      this.player.shieldCooldown = Math.max(0, this.player.shieldCooldown - dt);
      if (this.player.shieldCooldown <= 0) {
        this.player.shield = Math.min(
          this.player.shieldMax,
          this.player.shield + this.player.shieldRegen * dt,
        );
      }
    }

    if (this.player.regen > 0) {
      this.player.hp = Math.min(
        this.player.maxHp,
        this.player.hp + this.player.regen * dt,
      );
    }

    const playerMargin = this.player.radius + 8;
    this.player.x = clamp(this.player.x, playerMargin, WORLD_WIDTH - playerMargin);
    this.player.y = clamp(this.player.y, playerMargin, WORLD_HEIGHT - playerMargin);
  }

  private spawnFlies() {
    if (
      this.finalBossPending ||
      this.finalBossDefeated ||
      this.defeatedBosses.size >= 5 ||
      this.boss?.isFinal
    ) {
      return;
    }

    const bossTax = this.boss ? 0.8 : 1;
    const cap = Math.floor(Math.min(390, 46 + this.wave * 23) * bossTax);
    const interval = Math.max(0.072, 0.43 - this.wave * 0.024);

    while (this.spawnTimer >= interval && this.flies.length < cap) {
      this.spawnTimer -= interval;
      this.flies.push(this.createFly());
    }
  }

  private createFly(): FlyAgent {
    const side = Math.floor(Math.random() * 4);
    const margin = 28;
    const camera = this.getCamera();
    let x = 0;
    let y = 0;

    if (side === 0) {
      x = randomRange(camera.x, camera.x + VIEW_WIDTH);
      y = camera.y - margin;
    } else if (side === 1) {
      x = camera.x + VIEW_WIDTH + margin;
      y = randomRange(camera.y, camera.y + VIEW_HEIGHT);
    } else if (side === 2) {
      x = randomRange(camera.x, camera.x + VIEW_WIDTH);
      y = camera.y + VIEW_HEIGHT + margin;
    } else {
      x = camera.x - margin;
      y = randomRange(camera.y, camera.y + VIEW_HEIGHT);
    }

    x = clamp(x, -margin, WORLD_WIDTH + margin);
    y = clamp(y, -margin, WORLD_HEIGHT + margin);

    const roll = Math.random();
    let kind: FlyAgent['kind'] = 'DRONE';
    if (this.wave >= 4 && roll < 0.12) kind = 'BOMBER';
    else if (this.wave >= 3 && roll < 0.25) kind = 'SPITTER';
    else if (this.wave >= 2 && roll < 0.38) kind = 'BRUTE';
    else if (this.wave >= 2 && roll < 0.58) kind = 'DARTER';

    const mutate = (value: number, amount = 0.18) =>
      clamp(value + randomRange(-amount, amount), 0.05, 1);

    const genome: Genome = {
      aggression: mutate(this.swarmGenome.aggression),
      fear: mutate(this.swarmGenome.fear),
      social: mutate(this.swarmGenome.social),
      smell: mutate(this.swarmGenome.smell),
      speed: mutate(this.swarmGenome.speed, 0.14),
    };

    if (kind === 'DARTER') {
      genome.speed = clamp(genome.speed + 0.26, 0.05, 1);
      genome.fear = clamp(genome.fear - 0.12, 0.05, 1);
    } else if (kind === 'BRUTE') {
      genome.aggression = clamp(genome.aggression + 0.2, 0.05, 1);
      genome.speed = clamp(genome.speed - 0.2, 0.05, 1);
    } else if (kind === 'SPITTER') {
      genome.fear = clamp(genome.fear + 0.18, 0.05, 1);
      genome.social = clamp(genome.social - 0.12, 0.05, 1);
    } else if (kind === 'BOMBER') {
      genome.aggression = clamp(genome.aggression + 0.32, 0.05, 1);
      genome.fear = 0.05;
    }

    const baseHp = 27 + this.wave * 3.5;
    const hpMultiplier =
      kind === 'BRUTE'
        ? 3.25
        : kind === 'DARTER'
          ? 0.68
          : kind === 'SPITTER'
            ? 1.25
            : kind === 'BOMBER'
              ? 0.9
              : 1;
    const hp = baseHp * hpMultiplier;
    const radius =
      kind === 'BRUTE'
        ? 13.5
        : kind === 'DARTER'
          ? 7
          : kind === 'SPITTER'
            ? 9
            : kind === 'BOMBER'
              ? 10.5
              : 8.5;

    return {
      id: this.flyId++,
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      hp,
      maxHp: hp,
      radius,
      phase: Math.random() * TAU,
      genome,
      decision: 'WANDER',
      attackCooldown: randomRange(0.4, 1.6),
    };
  }

  private updateFlies(dt: number) {
    for (const fly of this.flies) {
      if (fly.hp <= 0) continue;
      fly.attackCooldown = Math.max(0, fly.attackCooldown - dt);

      const px = this.player.x - fly.x;
      const py = this.player.y - fly.y;
      const playerDistance = Math.hypot(px, py) || 1;
      const towardPlayer = { x: px / playerDistance, y: py / playerDistance };

      const neighbors = this.spatial
        .query(fly.x, fly.y, 92)
        .filter((other) => other.id !== fly.id && other.hp > 0);

      let nearestBullet: Bullet | null = null;
      let nearestBulletDistance = Infinity;
      for (const bullet of this.bullets) {
        const d = Math.hypot(bullet.x - fly.x, bullet.y - fly.y);
        if (d < nearestBulletDistance) {
          nearestBulletDistance = d;
          nearestBullet = bullet;
        }
      }

      const bulletThreat = nearestBullet
        ? clamp(1 - nearestBulletDistance / 105, 0, 1)
        : 0;
      const lowHp = 1 - fly.hp / fly.maxHp;
      const density = clamp(neighbors.length / 9, 0, 1);

      const chaseScore =
        fly.genome.aggression * 0.9 +
        fly.genome.smell * clamp(1 - playerDistance / 850, 0, 1) * 0.45;
      const fleeScore =
        fly.genome.fear * bulletThreat * 1.75 +
        fly.genome.fear * lowHp * 0.55;
      const swarmScore = fly.genome.social * density * 1.08;

      let desiredX = towardPlayer.x;
      let desiredY = towardPlayer.y;

      if (fly.kind === 'SPITTER') {
        fly.decision = playerDistance < 245 ? 'FLEE' : 'CHASE';
        if (playerDistance < 245) {
          desiredX = -towardPlayer.x;
          desiredY = -towardPlayer.y;
        } else if (playerDistance < 430) {
          desiredX = -towardPlayer.y * 0.9 + towardPlayer.x * 0.18;
          desiredY = towardPlayer.x * 0.9 + towardPlayer.y * 0.18;
        }

        if (fly.attackCooldown <= 0 && playerDistance < 590) {
          fly.attackCooldown = Math.max(0.68, 1.52 - this.wave * 0.038);
          this.fireEnemyShot(
            fly.x,
            fly.y,
            this.player.x,
            this.player.y,
            235 + this.wave * 5,
            8 + this.wave * 0.65,
            '#ff86d7',
          );
          this.spawnParticles(fly.x, fly.y, '#ff86d7', 6, 55);
        }
      } else if (
        fleeScore > chaseScore &&
        fleeScore > swarmScore &&
        nearestBullet &&
        fly.kind !== 'BOMBER'
      ) {
        fly.decision = 'FLEE';
        const away = normalize(fly.x - nearestBullet.x, fly.y - nearestBullet.y);
        desiredX = away.x;
        desiredY = away.y;
      } else if (
        swarmScore > chaseScore * 0.84 &&
        neighbors.length &&
        fly.kind !== 'BOMBER'
      ) {
        fly.decision = 'SWARM';
        let cx = 0;
        let cy = 0;
        let sx = 0;
        let sy = 0;

        for (const other of neighbors) {
          cx += other.x;
          cy += other.y;
          const dx = fly.x - other.x;
          const dy = fly.y - other.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < 30) {
            sx += dx / d;
            sy += dy / d;
          }
        }

        cx = cx / neighbors.length - fly.x;
        cy = cy / neighbors.length - fly.y;
        const cohesion = normalize(cx, cy);
        const separation = normalize(sx, sy);
        desiredX =
          cohesion.x * fly.genome.social * 0.48 +
          separation.x * 0.72 +
          towardPlayer.x * 0.72;
        desiredY =
          cohesion.y * fly.genome.social * 0.48 +
          separation.y * 0.72 +
          towardPlayer.y * 0.72;
      } else {
        fly.decision = 'CHASE';
      }

      const wobble = Math.sin(this.time * 7 + fly.phase) * 0.16;
      desiredX += Math.cos(fly.phase) * wobble;
      desiredY += Math.sin(fly.phase) * wobble;
      const desired = normalize(desiredX, desiredY);

      const kindSpeed =
        fly.kind === 'DARTER'
          ? 1.62
          : fly.kind === 'BRUTE'
            ? 0.68
            : fly.kind === 'SPITTER'
              ? 0.8
              : fly.kind === 'BOMBER'
                ? 1.24
                : 1;
      const speed =
        (90 + fly.genome.speed * 92 + this.wave * 4.2) *
        (fly.decision === 'FLEE' ? 1.14 : 1) *
        kindSpeed;
      const steer = clamp(dt * (fly.kind === 'DARTER' ? 7.8 : 5.2), 0, 1);
      fly.vx += (desired.x * speed - fly.vx) * steer;
      fly.vy += (desired.y * speed - fly.vy) * steer;
      fly.x += fly.vx * dt;
      fly.y += fly.vy * dt;

      if (
        fly.kind === 'BOMBER' &&
        playerDistance < this.player.radius + fly.radius + 13
      ) {
        this.damagePlayer(22 + this.wave * 1.7);
        this.screenShake = Math.max(this.screenShake, 10);
        this.damageFlash = Math.max(this.damageFlash, 0.22);
        this.spawnParticles(fly.x, fly.y, '#ff5b63', 24, 160);
        fly.hp = 0;
        this.killFly(fly);
        continue;
      }

      if (playerDistance < this.player.radius + fly.radius + 5) {
        const kindDamage =
          fly.kind === 'BRUTE' ? 2.15 : fly.kind === 'DARTER' ? 0.85 : 1;
        const contactDps =
          (10.5 + this.wave * 1.45 + fly.genome.aggression * 4.5) * kindDamage;
        this.damagePlayer(contactDps * dt);
        fly.x -= towardPlayer.x * 42 * dt;
        fly.y -= towardPlayer.y * 42 * dt;
      }
    }
  }

  private getBossColor(kind: BossKind) {
    return kind === 'NEURAL_HUNTER'
      ? '#ffcf57'
      : kind === 'STORM_BRAIN'
        ? '#b678ff'
        : kind === 'SWARM_QUEEN'
          ? '#c7ff45'
          : kind === 'GLIAL_TITAN'
            ? '#55ffc7'
            : kind === 'CONNECTOME_APEX'
              ? '#ff5b63'
              : '#ff4fd8';
  }

  private getBossPulseRadius(boss: Boss) {
    const base =
      boss.kind === 'STORM_BRAIN'
        ? 255
        : boss.kind === 'GLIAL_TITAN'
          ? 292
          : boss.kind === 'CONNECTOME_APEX'
            ? 275
            : boss.kind === 'VIRTUAL_DROSOPHILA'
              ? 345
              : boss.kind === 'SWARM_QUEEN'
                ? 225
                : 210;
    return base + (boss.stage - 1) * 8;
  }

  private beginFinalEncounter() {
    this.finalBossPending = true;
    this.finalBossCountdown = 3.25;
    this.selectedId = null;

    // Final arena must be a true 1:1 encounter.
    this.flies = [];
    this.bullets = [];
    this.enemyShots = [];
    this.bossStrikes = [];
    this.chests = [];
    this.orbs = [];
    this.damageFields = [];

    this.spawnTimer = 0;
    this.bossBrainTimer = 0;
    this.bossPolicyTurn = 0;
    this.bossPolicyDrive = 0;
    this.bossRewardBuffer = 0;
    this.bossPenaltyBuffer = 0;
    this.finalMemoryDriveBias = 0;
    this.finalMemoryVigilance = 0;
    this.mushroomBody.resetEpisode();
    this.brain.reset();

    this.screenShake = Math.max(this.screenShake, 20);
    this.spawnRing(
      this.player.x,
      this.player.y,
      40,
      520,
      '#ff4fd8',
      1.1,
      10,
    );
    this.emitHud();
  }

  private spawnFinalBoss() {
    if (
      this.finalBossDefeated ||
      this.boss ||
      this.brain.getSnapshot().status !== 'ready'
    ) {
      return;
    }

    const camera = this.getCamera();
    const maxHp = Math.max(
      50000,
      (5200 + this.wave * 620) * 4.25,
    );

    this.boss = {
      kind: 'VIRTUAL_DROSOPHILA',
      name: 'VIRTUAL DROSOPHILA',
      x: clamp(camera.x + VIEW_WIDTH / 2, 100, WORLD_WIDTH - 100),
      y: clamp(camera.y + 108, 100, WORLD_HEIGHT - 100),
      vx: 0,
      vy: 0,
      radius: 58,
      hp: maxHp,
      maxHp,
      heading: Math.PI / 2,
      pulseCooldown: 0.78,
      specialCooldown: 1.45,
      stage: 6,
      damageScale: 2.15,
      speedScale: 1.46,
      cooldownScale: 0.48,
      angularVelocity: 0,
      turnHold: 0,
      lastTurnSign: 0,
      threatActive: false,
      threatPeak: 0,
      dodgeRewardCooldown: 0,
      isFinal: true,
      phase: 1,
    };

    this.finalBossPending = false;
    this.finalBossCountdown = 0;
    this.bossBrainTimer = 0;
    this.bossPolicyTurn = 0;
    this.bossPolicyDrive = 0;
    this.bossRewardBuffer = 0;
    this.bossPenaltyBuffer = 0;
    this.finalMemoryDriveBias = 0;
    this.finalMemoryVigilance = 0;
    this.mushroomBody.resetEpisode();
    this.brain.reset();

    this.screenShake = Math.max(this.screenShake, 24);
    this.spawnParticles(
      this.boss.x,
      this.boss.y,
      '#ff4fd8',
      96,
      310,
    );
    this.spawnRing(
      this.boss.x,
      this.boss.y,
      28,
      390,
      '#ffffff',
      0.95,
      14,
    );
    this.spawnRing(
      this.boss.x,
      this.boss.y,
      50,
      290,
      '#ff4fd8',
      0.78,
      9,
    );
    this.callbacks.onSound('finalBossSpawn');
    this.emitHud();
  }

  private spawnBoss() {
    const kinds: CoreBossKind[] = [
      'NEURAL_HUNTER',
      'STORM_BRAIN',
      'SWARM_QUEEN',
      'GLIAL_TITAN',
      'CONNECTOME_APEX',
    ];
    const stage = Math.min(5, this.bossIndex + 1);
    const kind = kinds[stage - 1];
    this.bossIndex += 1;

    const config =
      kind === 'NEURAL_HUNTER'
        ? { name: 'NEURAL HUNTER', hp: 0.96, radius: 31, special: 2.55 }
        : kind === 'STORM_BRAIN'
          ? { name: 'STORM BRAIN', hp: 1.12, radius: 36, special: 2.95 }
          : kind === 'SWARM_QUEEN'
            ? { name: 'SWARM QUEEN', hp: 1.34, radius: 43, special: 4.15 }
            : kind === 'GLIAL_TITAN'
              ? { name: 'GLIAL TITAN', hp: 1.56, radius: 47, special: 3.55 }
              : { name: 'CONNECTOME APEX', hp: 1.82, radius: 51, special: 2.7 };

    const hpScale = 1 + (stage - 1) * 0.28;
    const damageScale = 1 + (stage - 1) * 0.16;
    const speedScale = 1 + (stage - 1) * 0.065;
    const cooldownScale = Math.max(0.68, 1 - (stage - 1) * 0.07);
    const maxHp = (1120 + this.wave * 330) * config.hp * hpScale;
    const camera = this.getCamera();

    this.boss = {
      kind,
      name: config.name,
      x: clamp(camera.x + VIEW_WIDTH / 2, 80, WORLD_WIDTH - 80),
      y: clamp(camera.y + 92, 80, WORLD_HEIGHT - 80),
      vx: 0,
      vy: 0,
      radius: config.radius,
      hp: maxHp,
      maxHp,
      heading: Math.PI / 2,
      pulseCooldown: 1.25 * cooldownScale,
      specialCooldown: config.special * cooldownScale,
      stage,
      damageScale,
      speedScale,
      cooldownScale,
      angularVelocity: 0,
      turnHold: 0,
      lastTurnSign: 0,
      threatActive: false,
      threatPeak: 0,
      dodgeRewardCooldown: 0,
      isFinal: false,
      phase: 1,
    };

    this.bossBrainTimer = 0;
    this.bossPolicyTurn = 0;
    this.bossPolicyDrive = 0;
    this.bossRewardBuffer = 0;
    this.bossPenaltyBuffer = 0;
    this.screenShake = Math.max(this.screenShake, 7 + stage * 1.2);
    this.spawnParticles(
      this.boss.x,
      this.boss.y,
      this.getBossColor(kind),
      28 + stage * 5,
      140 + stage * 12,
    );
    this.spawnRing(
      this.boss.x,
      this.boss.y,
      20,
      120 + stage * 18,
      this.getBossColor(kind),
      0.65,
      5 + stage,
    );
    this.callbacks.onSound('bossSpawn');
    this.brain.reset();
  }

  private getBossProjectileThreat(boss: Boss) {
    const horizon = 0.86 + boss.stage * 0.045;
    let best = {
      score: 0,
      evadeX: 0,
      evadeY: 0,
      side: 0,
      timeToImpact: horizon,
      closestDistance: Infinity,
    };

    for (const bullet of this.bullets) {
      if (bullet.life <= 0 || bullet.hit.has(BOSS_HIT_ID)) continue;

      const relX = bullet.x - boss.x;
      const relY = bullet.y - boss.y;
      const relVx = bullet.vx - boss.vx;
      const relVy = bullet.vy - boss.vy;
      const relativeSpeedSq = relVx * relVx + relVy * relVy;
      if (relativeSpeedSq < 1) continue;

      const closingDot = relX * relVx + relY * relVy;
      if (closingDot >= 0) continue;

      const timeToImpact = -closingDot / relativeSpeedSq;
      if (timeToImpact <= 0 || timeToImpact > horizon) continue;

      const closestX = relX + relVx * timeToImpact;
      const closestY = relY + relVy * timeToImpact;
      const closestDistance = Math.hypot(closestX, closestY);
      const dangerRadius =
        boss.radius + bullet.radius + 52 + boss.stage * 5;
      if (closestDistance >= dangerRadius) continue;

      const timeScore = 1 - timeToImpact / horizon;
      const pathScore = 1 - closestDistance / dangerRadius;
      const score = clamp(timeScore * 0.58 + pathScore * 0.72, 0, 1);
      if (score <= best.score) continue;

      const bulletDirection = normalize(bullet.vx, bullet.vy);
      let evadeX = -bulletDirection.y;
      let evadeY = bulletDirection.x;

      const awayX = -closestX;
      const awayY = -closestY;
      const separationDot = evadeX * awayX + evadeY * awayY;
      if (separationDot < 0) {
        evadeX *= -1;
        evadeY *= -1;
      } else if (Math.abs(separationDot) < 0.001) {
        const cross =
          bullet.vx * (boss.y - bullet.y) -
          bullet.vy * (boss.x - bullet.x);
        if (cross < 0) {
          evadeX *= -1;
          evadeY *= -1;
        }
      }

      const rightX = -Math.sin(boss.heading);
      const rightY = Math.cos(boss.heading);
      best = {
        score,
        evadeX,
        evadeY,
        side: clamp(evadeX * rightX + evadeY * rightY, -1, 1),
        timeToImpact,
        closestDistance,
      };
    }

    return best;
  }

  private updateBoss(dt: number) {
    if (!this.boss) return;
    const boss = this.boss;
    const brain = this.brain.getSnapshot();
    if (brain.status !== 'ready') return;

    this.bossBrainTimer += dt;
    boss.pulseCooldown = Math.max(0, boss.pulseCooldown - dt);
    boss.specialCooldown = Math.max(0, boss.specialCooldown - dt);
    boss.dodgeRewardCooldown = Math.max(
      0,
      boss.dodgeRewardCooldown - dt,
    );

    const projectileThreat = this.getBossProjectileThreat(boss);

    if (boss.isFinal) {
      const hpRatio = boss.hp / boss.maxHp;
      const nextPhase = hpRatio > 0.7 ? 1 : hpRatio > 0.35 ? 2 : 3;
      if (nextPhase !== boss.phase) {
        boss.phase = nextPhase;
        this.callbacks.onSound('finalBossPhase');
        this.screenShake = Math.max(this.screenShake, 18 + nextPhase * 3);
        this.spawnRing(
          boss.x,
          boss.y,
          30,
          260 + nextPhase * 55,
          '#ff4fd8',
          0.75,
          8 + nextPhase * 2,
        );
        this.spawnParticles(
          boss.x,
          boss.y,
          '#ffffff',
          35 + nextPhase * 16,
          210 + nextPhase * 35,
        );
      }
    }
    if (projectileThreat.score > 0.2) {
      if (!boss.threatActive) {
        this.spawnParticles(
          boss.x,
          boss.y,
          this.getBossColor(boss.kind),
          5,
          65,
        );
      }
      boss.threatActive = true;
      boss.threatPeak = Math.max(
        boss.threatPeak,
        projectileThreat.score,
      );
    } else if (
      boss.threatActive &&
      projectileThreat.score < 0.06
    ) {
      if (
        boss.threatPeak >= 0.3 &&
        boss.dodgeRewardCooldown <= 0
      ) {
        this.bossRewardBuffer += 0.08 + boss.threatPeak * 0.12;
        boss.dodgeRewardCooldown = 0.5;
        this.spawnRing(
          boss.x,
          boss.y,
          boss.radius + 4,
          boss.radius + 20,
          this.getBossColor(boss.kind),
          0.18,
          2,
        );
      }
      boss.threatActive = false;
      boss.threatPeak = 0;
    }

    if (this.bossBrainTimer >= 0.32) {
      this.bossBrainTimer = 0;

      const reward = this.bossRewardBuffer - this.bossPenaltyBuffer;
      if (Math.abs(reward) > 0.0001) {
        this.dopamine.reward(reward);
        if (boss.isFinal) {
          this.mushroomBody.reward(reward);
        }
      }
      this.bossRewardBuffer = 0;
      this.bossPenaltyBuffer = 0;

      const dx = this.player.x - boss.x;
      const dy = this.player.y - boss.y;
      const distance = Math.hypot(dx, dy) || 1;
      const proximity = clamp(1 - distance / 1050, 0, 1);

      if (boss.isFinal) {
        const memory = this.mushroomBody.evaluate(
          brain.output,
          projectileThreat.score,
          proximity,
          1 - boss.hp / boss.maxHp,
        );
        this.finalMemoryDriveBias = memory.driveBias;
        this.finalMemoryVigilance = memory.vigilance;
      }

      const policyAction = this.dopamine.act(brain.output);
      this.bossPolicyTurn = clamp(
        policyAction.turn +
          (boss.isFinal
            ? projectileThreat.side *
              this.finalMemoryVigilance *
              0.22
            : 0),
        -1,
        1,
      );
      this.bossPolicyDrive = clamp(
        policyAction.drive +
          (boss.isFinal
            ? this.finalMemoryDriveBias * 0.72
            : 0),
        -1,
        1,
      );

      const towardPlayer = normalize(dx, dy);
      const rightX = -Math.sin(boss.heading);
      const rightY = Math.cos(boss.heading);
      const playerSide = clamp(
        towardPlayer.x * rightX + towardPlayer.y * rightY,
        -1,
        1,
      );
      const dodgeWeight = clamp(
        projectileThreat.score *
          (boss.isFinal
            ? 1.35 + this.finalMemoryVigilance * 0.55
            : 1.2),
        0,
        1,
      );
      const sensorySide = clamp(
        playerSide * (1 - dodgeWeight) +
          projectileThreat.side * dodgeWeight,
        -1,
        1,
      );
      const threat = clamp(
        0.06 +
          proximity * (boss.isFinal ? 0.58 : 0.46) +
          projectileThreat.score *
            (boss.isFinal ? 1.18 : 0.98),
        0,
        1,
      );
      this.brain.step(sensorySide, threat);
    }

    const out = this.brain.getSnapshot().output;
    const dx = this.player.x - boss.x;
    const dy = this.player.y - boss.y;
    const distance = Math.hypot(dx, dy) || 1;

    const turnSign =
      Math.abs(this.bossPolicyTurn) > 0.18
        ? Math.sign(this.bossPolicyTurn)
        : 0;

    if (turnSign !== 0 && turnSign === boss.lastTurnSign) {
      boss.turnHold += dt;
    } else if (turnSign !== 0) {
      boss.turnHold = 0;
      boss.lastTurnSign = turnSign;
    } else {
      boss.turnHold = Math.max(0, boss.turnHold - dt * 1.8);
      if (boss.turnHold <= 0.05) boss.lastTurnSign = 0;
    }

    const antiOrbit =
      projectileThreat.score > 0.2
        ? 1
        : clamp(
            1 - Math.max(0, boss.turnHold - 0.85) * 0.4,
            0.28,
            1,
          );
    const dodgeTurn =
      projectileThreat.side *
      projectileThreat.score *
      (1.45 + boss.stage * 0.1) *
      (boss.isFinal
        ? 1.25 + this.finalMemoryVigilance * 0.75
        : 1);
    const targetAngularVelocity =
      this.bossPolicyTurn *
        3.75 *
        boss.speedScale *
        antiOrbit +
      dodgeTurn;

    const angularResponse =
      projectileThreat.score > 0.2
        ? boss.isFinal
          ? 13.5
          : 10
        : boss.isFinal
          ? 6.8
          : 5.2;
    boss.angularVelocity +=
      (targetAngularVelocity - boss.angularVelocity) *
      clamp(dt * angularResponse, 0, 1);
    boss.angularVelocity *= Math.exp(-dt * 0.42);
    boss.heading += boss.angularVelocity * dt;

    const forward = {
      x: Math.cos(boss.heading),
      y: Math.sin(boss.heading),
    };

    const kindDrive =
      boss.kind === 'NEURAL_HUNTER'
        ? 1.24
        : boss.kind === 'STORM_BRAIN'
          ? 0.96
          : boss.kind === 'SWARM_QUEEN'
            ? 0.8
            : boss.kind === 'GLIAL_TITAN'
              ? 0.74
              : boss.kind === 'VIRTUAL_DROSOPHILA'
                ? 1.2 + (boss.phase - 1) * 0.1
                : 1.08;

    let drive =
      this.bossPolicyDrive *
      320 *
      kindDrive *
      boss.speedScale;

    if (
      (boss.kind === 'NEURAL_HUNTER' ||
        boss.kind === 'CONNECTOME_APEX' ||
        boss.kind === 'VIRTUAL_DROSOPHILA') &&
      distance < 350 &&
      out.forward > 0.3
    ) {
      drive *= 1.28;
    }

    let desiredX = forward.x * drive;
    let desiredY = forward.y * drive;

    if (projectileThreat.score > 0) {
      const imminentBoost =
        1 +
        clamp(
          (0.3 - projectileThreat.timeToImpact) / 0.3,
          0,
          1,
        ) *
          0.65;
      const reflexStrength =
        (125 + boss.stage * 24) *
        projectileThreat.score *
        imminentBoost *
        (boss.isFinal
          ? 1.45 + this.finalMemoryVigilance * 0.8
          : 1);
      desiredX += projectileThreat.evadeX * reflexStrength;
      desiredY += projectileThreat.evadeY * reflexStrength;
    }
    const baseResponse =
      boss.kind === 'NEURAL_HUNTER'
        ? 5
        : boss.kind === 'VIRTUAL_DROSOPHILA'
          ? 6.6
          : boss.kind === 'CONNECTOME_APEX'
            ? 4.7
            : boss.kind === 'STORM_BRAIN'
            ? 4
            : 3.65;
    const responsiveness = clamp(
      dt * baseResponse * boss.speedScale,
      0,
      1,
    );

    boss.vx += (desiredX - boss.vx) * responsiveness;
    boss.vy += (desiredY - boss.vy) * responsiveness;
    boss.x += boss.vx * dt;
    boss.y += boss.vy * dt;

    if (boss.x < boss.radius || boss.x > WORLD_WIDTH - boss.radius) {
      boss.x = clamp(boss.x, boss.radius, WORLD_WIDTH - boss.radius);
      boss.heading = Math.PI - boss.heading;
      boss.vx *= -0.45;
    }
    if (boss.y < boss.radius || boss.y > WORLD_HEIGHT - boss.radius) {
      boss.y = clamp(boss.y, boss.radius, WORLD_HEIGHT - boss.radius);
      boss.heading *= -1;
      boss.vy *= -0.45;
    }

    if (distance < boss.radius + this.player.radius + 8) {
      const contactScale =
        boss.kind === 'SWARM_QUEEN'
          ? 1.28
          : boss.kind === 'GLIAL_TITAN'
            ? 1.48
            : boss.kind === 'VIRTUAL_DROSOPHILA'
              ? 1.9 + (boss.phase - 1) * 0.18
              : boss.kind === 'CONNECTOME_APEX'
                ? 1.38
                : boss.kind === 'NEURAL_HUNTER'
                ? 1.12
                : 1;
      this.damagePlayerFromBoss(
        (24 + this.wave * 1.65) *
          contactScale *
          boss.damageScale *
          dt,
      );
    }

    if (
      boss.pulseCooldown <= 0 &&
      (out.activity > 0.5 || out.wing > 0.46)
    ) {
      const pulseRadius = this.getBossPulseRadius(boss);
      const pulseBaseCooldown =
        boss.kind === 'STORM_BRAIN'
          ? 1.7
          : boss.kind === 'GLIAL_TITAN'
            ? 1.85
            : boss.kind === 'VIRTUAL_DROSOPHILA'
              ? boss.phase === 1
                ? 1.15
                : boss.phase === 2
                  ? 0.9
                  : 0.68
              : boss.kind === 'CONNECTOME_APEX'
                ? 1.5
                : 2.25;
      const pulseDamageScale =
        boss.kind === 'GLIAL_TITAN'
          ? 1.28
          : boss.kind === 'VIRTUAL_DROSOPHILA'
            ? 1.85 + (boss.phase - 1) * 0.22
            : boss.kind === 'CONNECTOME_APEX'
              ? 1.42
              : boss.kind === 'STORM_BRAIN'
              ? 1.18
              : 1;

      boss.pulseCooldown =
        pulseBaseCooldown * boss.cooldownScale;
      this.bossPulseFlash = 0.5;
      this.screenShake = Math.max(this.screenShake, 5 + boss.stage);
      this.spawnParticles(
        boss.x,
        boss.y,
        this.getBossColor(boss.kind),
        18 + boss.stage * 2,
        120 + boss.stage * 8,
      );

      if (distance < pulseRadius) {
        this.damagePlayerFromBoss(
          (10 + this.wave * 1.25) *
            pulseDamageScale *
            boss.damageScale,
        );
      }
    }

    if (boss.specialCooldown > 0) return;

    if (boss.kind === 'NEURAL_HUNTER') {
      boss.specialCooldown = 2.55 * boss.cooldownScale;
      for (let i = -1; i <= 1; i += 1) {
        const angle = Math.atan2(dy, dx) + i * 0.18;
        this.enemyShots.push({
          x: boss.x,
          y: boss.y,
          vx:
            Math.cos(angle) *
            (270 + this.wave * 4.5) *
            boss.speedScale,
          vy:
            Math.sin(angle) *
            (270 + this.wave * 4.5) *
            boss.speedScale,
          radius: 5.5,
          damage:
            (8.5 + this.wave * 0.58) * boss.damageScale,
          life: 3.5,
          color: '#ffcf57',
          bossOwned: true,
        });
      }
      return;
    }

    if (boss.kind === 'STORM_BRAIN') {
      boss.specialCooldown = 2.95 * boss.cooldownScale;
      const shotCount = 12 + boss.stage;
      for (let i = 0; i < shotCount; i += 1) {
        const angle =
          (i / shotCount) * TAU + this.time * 0.35;
        this.enemyShots.push({
          x: boss.x,
          y: boss.y,
          vx:
            Math.cos(angle) *
            (190 + this.wave * 3.5) *
            boss.speedScale,
          vy:
            Math.sin(angle) *
            (190 + this.wave * 3.5) *
            boss.speedScale,
          radius: 6,
          damage:
            (9 + this.wave * 0.62) * boss.damageScale,
          life: 4.8,
          color: '#b678ff',
          bossOwned: true,
        });
      }

      this.callbacks.onSound('bossStrikeCharge');
      this.bossStrikes.push({
        x: this.player.x,
        y: this.player.y,
        timer: 0.5,
        maxTimer: 0.5,
        radius: 82,
        damage:
          (14 + this.wave * 0.9) * boss.damageScale,
        color: '#b678ff',
      });
      this.spawnRing(
        this.player.x,
        this.player.y,
        18,
        82,
        '#b678ff',
        0.5,
        3,
      );
      return;
    }

    if (boss.kind === 'SWARM_QUEEN') {
      boss.specialCooldown = 4.15 * boss.cooldownScale;
      const minionCount = 7 + boss.stage;
      for (let i = 0; i < minionCount; i += 1) {
        const minion = this.createFly();
        minion.x = clamp(
          boss.x + randomRange(-105, 105),
          20,
          WORLD_WIDTH - 20,
        );
        minion.y = clamp(
          boss.y + randomRange(-105, 105),
          20,
          WORLD_HEIGHT - 20,
        );
        minion.kind = i % 3 === 0 ? 'SPITTER' : 'DARTER';
        minion.hp *= 1.2 + boss.stage * 0.12;
        minion.maxHp = minion.hp;
        this.flies.push(minion);
      }

      for (let i = 0; i < 6; i += 1) {
        const angle = (i / 6) * TAU + boss.heading;
        this.enemyShots.push({
          x: boss.x,
          y: boss.y,
          vx: Math.cos(angle) * 210 * boss.speedScale,
          vy: Math.sin(angle) * 210 * boss.speedScale,
          radius: 6,
          damage: (8 + this.wave * 0.55) * boss.damageScale,
          life: 4,
          color: '#c7ff45',
          bossOwned: true,
        });
      }
      this.spawnParticles(boss.x, boss.y, '#c7ff45', 30, 150);
      return;
    }

    if (boss.kind === 'GLIAL_TITAN') {
      boss.specialCooldown = 3.55 * boss.cooldownScale;
      const shotCount = 14;
      for (let i = 0; i < shotCount; i += 1) {
        const angle = (i / shotCount) * TAU + this.time * 0.18;
        const speed = (145 + (i % 2) * 55) * boss.speedScale;
        this.enemyShots.push({
          x: boss.x,
          y: boss.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: i % 2 === 0 ? 8 : 6,
          damage:
            (10.5 + this.wave * 0.68) * boss.damageScale,
          life: 5.4,
          color: '#55ffc7',
          bossOwned: true,
        });
      }

      this.callbacks.onSound('bossStrikeCharge');
      for (let i = 0; i < 3; i += 1) {
        const angle = (i / 3) * TAU + this.time * 0.3;
        const x = clamp(
          this.player.x + Math.cos(angle) * 115,
          70,
          WORLD_WIDTH - 70,
        );
        const y = clamp(
          this.player.y + Math.sin(angle) * 115,
          70,
          WORLD_HEIGHT - 70,
        );
        this.bossStrikes.push({
          x,
          y,
          timer: 0.68,
          maxTimer: 0.68,
          radius: 94,
          damage:
            (13 + this.wave * 0.82) * boss.damageScale,
          color: '#55ffc7',
        });
        this.spawnRing(x, y, 20, 94, '#55ffc7', 0.68, 4);
      }
      return;
    }

    if (boss.kind === 'CONNECTOME_APEX') {
      boss.specialCooldown = 2.7 * boss.cooldownScale;

      const radialCount = 18;
      for (let i = 0; i < radialCount; i += 1) {
        const angle =
          (i / radialCount) * TAU + this.time * 0.46;
        this.enemyShots.push({
          x: boss.x,
          y: boss.y,
          vx:
            Math.cos(angle) *
            (215 + this.wave * 4) *
            boss.speedScale,
          vy:
            Math.sin(angle) *
            (215 + this.wave * 4) *
            boss.speedScale,
          radius: 6.5,
          damage:
            (9.5 + this.wave * 0.65) * boss.damageScale,
          life: 4.5,
          color: '#ff5b63',
          bossOwned: true,
        });
      }

      for (let i = -2; i <= 2; i += 1) {
        const angle = Math.atan2(dy, dx) + i * 0.13;
        this.enemyShots.push({
          x: boss.x,
          y: boss.y,
          vx:
            Math.cos(angle) *
            (315 + this.wave * 5) *
            boss.speedScale,
          vy:
            Math.sin(angle) *
            (315 + this.wave * 5) *
            boss.speedScale,
          radius: 5.5,
          damage:
            (10.5 + this.wave * 0.7) * boss.damageScale,
          life: 3.6,
          color: '#ffffff',
          bossOwned: true,
        });
      }

      this.callbacks.onSound('bossStrikeCharge');
      const apexOffsets = [
        { x: 0, y: 0 },
        { x: 125, y: -70 },
        { x: -125, y: 70 },
      ];
      for (const offset of apexOffsets) {
        const x = clamp(
          this.player.x + offset.x,
          80,
          WORLD_WIDTH - 80,
        );
        const y = clamp(
          this.player.y + offset.y,
          80,
          WORLD_HEIGHT - 80,
        );
        this.bossStrikes.push({
          x,
          y,
          timer: 0.46,
          maxTimer: 0.46,
          radius: 88,
          damage:
            (15 + this.wave * 0.95) * boss.damageScale,
          color: '#ff5b63',
        });
        this.spawnRing(x, y, 18, 88, '#ff5b63', 0.46, 4);
      }

      for (let i = 0; i < 4; i += 1) {
        const minion = this.createFly();
        minion.x = clamp(
          boss.x + randomRange(-120, 120),
          20,
          WORLD_WIDTH - 20,
        );
        minion.y = clamp(
          boss.y + randomRange(-120, 120),
          20,
          WORLD_HEIGHT - 20,
        );
        minion.kind = i % 2 === 0 ? 'BOMBER' : 'SPITTER';
        minion.hp *= 1.7;
        minion.maxHp = minion.hp;
        this.flies.push(minion);
      }
      return;
    }

    // VIRTUAL DROSOPHILA: no minions. Its learned valence changes the mix
    // between pursuit fire and avoidance-oriented area denial.
    const memory = this.mushroomBody.getSnapshot();
    const approachBias = clamp(
      0.5 + (memory.approach - memory.avoidance),
      0,
      1,
    );
    const avoidBias = clamp(
      0.5 + (memory.avoidance - memory.approach),
      0,
      1,
    );
    const phase = boss.phase;

    const cooldownBase =
      phase === 1 ? 1.72 : phase === 2 ? 1.28 : 0.96;
    boss.specialCooldown =
      cooldownBase *
      Math.max(0.72, boss.cooldownScale * 1.55);

    const radialCount =
      phase === 1 ? 20 : phase === 2 ? 26 : 32;
    const radialSpeed =
      (225 + phase * 34 + avoidBias * 55) * boss.speedScale;

    for (let i = 0; i < radialCount; i += 1) {
      const angle =
        (i / radialCount) * TAU +
        this.time * (0.44 + phase * 0.12) +
        (i % 2) * 0.035;
      this.enemyShots.push({
        x: boss.x,
        y: boss.y,
        vx: Math.cos(angle) * radialSpeed,
        vy: Math.sin(angle) * radialSpeed,
        radius: phase === 3 && i % 2 === 0 ? 7 : 5.8,
        damage:
          (7.2 + this.wave * 0.48 + phase * 1.2) *
          boss.damageScale,
        life: 4.8,
        color: i % 2 === 0 ? '#ff4fd8' : '#ffffff',
        bossOwned: true,
      });
    }

    const aimedCount =
      phase === 1
        ? 5
        : phase === 2
          ? 7
          : 9;
    const aimedSpread =
      phase === 3 ? 0.095 : 0.12;

    for (let i = 0; i < aimedCount; i += 1) {
      const centered = i - (aimedCount - 1) / 2;
      const angle =
        Math.atan2(dy, dx) +
        centered * aimedSpread;
      const speed =
        (350 +
          phase * 38 +
          approachBias * 95) *
        boss.speedScale;

      this.enemyShots.push({
        x: boss.x,
        y: boss.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 5.2,
        damage:
          (8.5 + this.wave * 0.56 + phase * 1.6) *
          boss.damageScale,
        life: 3.4,
        color: '#ffffff',
        bossOwned: true,
      });
    }

    const strikeCount =
      phase === 1
        ? 2
        : phase === 2
          ? 4
          : 6;
    const strikeRadius =
      phase === 3 ? 86 : 78;

    this.callbacks.onSound('bossStrikeCharge');
    for (let i = 0; i < strikeCount; i += 1) {
      const angle =
        (i / strikeCount) * TAU +
        this.time * 0.28;
      const spread =
        72 + i * 22 + avoidBias * 34;
      const x = clamp(
        this.player.x + Math.cos(angle) * spread,
        90,
        WORLD_WIDTH - 90,
      );
      const y = clamp(
        this.player.y + Math.sin(angle) * spread,
        90,
        WORLD_HEIGHT - 90,
      );

      this.bossStrikes.push({
        x,
        y,
        timer: phase === 3 ? 0.34 : 0.42,
        maxTimer: phase === 3 ? 0.34 : 0.42,
        radius: strikeRadius,
        damage:
          (14 + this.wave * 0.75 + phase * 2.3) *
          boss.damageScale,
        color: '#ff4fd8',
      });
      this.spawnRing(
        x,
        y,
        16,
        strikeRadius,
        '#ff4fd8',
        phase === 3 ? 0.34 : 0.42,
        4,
      );
    }

    if (phase >= 2) {
      const waveCount = phase === 2 ? 8 : 12;
      for (let i = 0; i < waveCount; i += 1) {
        const angle =
          boss.heading +
          (i / waveCount) * TAU +
          Math.sin(this.time * 1.7) * 0.12;
        const speed =
          (170 + (i % 3) * 55) * boss.speedScale;
        this.enemyShots.push({
          x: boss.x,
          y: boss.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 8.2,
          damage:
            (7 + this.wave * 0.45 + phase) *
            boss.damageScale,
          life: 5.2,
          color: '#8cf5ff',
          bossOwned: true,
        });
      }
    }

    this.spawnParticles(
      boss.x,
      boss.y,
      '#ff4fd8',
      18 + phase * 8,
      160 + phase * 30,
    );
    this.spawnRing(
      boss.x,
      boss.y,
      16,
      110 + phase * 24,
      '#ffffff',
      0.32,
      4 + phase,
    );
  }

  private updateShooting() {
    const lowHpAdrenaline =
      this.player.hp / this.player.maxHp < 0.35
        ? 1 + this.player.adrenaline * 0.18
        : 1;
    const currentFireInterval = this.player.fireInterval / lowHpAdrenaline;
    if (this.shootTimer < currentFireInterval) return;
    if (!this.flies.length && !this.boss) return;
    this.shootTimer = 0;

    let targetX = 0;
    let targetY = 0;
    let best = Infinity;

    for (const fly of this.flies) {
      if (fly.hp <= 0) continue;
      const d2 =
        (fly.x - this.player.x) ** 2 +
        (fly.y - this.player.y) ** 2;
      if (d2 < best) {
        best = d2;
        targetX = fly.x;
        targetY = fly.y;
      }
    }

    if (this.boss) {
      const d2 =
        (this.boss.x - this.player.x) ** 2 +
        (this.boss.y - this.player.y) ** 2;
      if (d2 < best) {
        best = d2;
        targetX = this.boss.x;
        targetY = this.boss.y;
      }
    }

    if (!Number.isFinite(best)) return;

    const base = Math.atan2(targetY - this.player.y, targetX - this.player.x);
    const count = this.player.bulletCount;

    for (let i = 0; i < count; i += 1) {
      const offset =
        count === 1
          ? 0
          : (i - (count - 1) / 2) * Math.min(0.17, 0.42 / count);
      const angle = base + offset;
      const critical = Math.random() < this.player.critChance;
      this.bullets.push({
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(angle) * this.player.bulletSpeed,
        vy: Math.sin(angle) * this.player.bulletSpeed,
        radius: this.player.bulletSize,
        life: this.player.bulletLife,
        damage:
          this.player.damage *
          (critical ? this.player.critMultiplier : 1),
        pierce: this.player.pierce,
        hit: new Set<number>(),
        critical,
        style: 'NORMAL',
      });
    }

    this.callbacks.onSound('shot');
  }

  private updateBullets(dt: number) {
    for (const bullet of this.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      if (bullet.life <= 0) continue;

      if (
        this.boss &&
        !bullet.hit.has(BOSS_HIT_ID) &&
        Math.hypot(this.boss.x - bullet.x, this.boss.y - bullet.y) <=
          this.boss.radius + bullet.radius
      ) {
        bullet.hit.add(BOSS_HIT_ID);
        this.boss.threatActive = false;
        this.boss.threatPeak = 0;
        this.damageBoss(bullet.damage * this.player.bossDamage);
        this.spawnParticles(
          bullet.x,
          bullet.y,
          bullet.style === 'LANCE' ? '#ffffff' : '#c7ff45',
          bullet.style === 'LANCE' ? 12 : 6,
          95,
        );
        const push = normalize(bullet.vx, bullet.vy);
        if (this.boss) {
          this.boss.vx += push.x * this.player.knockback * 0.15;
          this.boss.vy += push.y * this.player.knockback * 0.15;
        }

        if (bullet.pierce > 0) bullet.pierce -= 1;
        else {
          bullet.life = 0;
          continue;
        }
      }

      const candidates = this.spatial.query(bullet.x, bullet.y, 30);
      for (const fly of candidates) {
        if (fly.hp <= 0 || bullet.hit.has(fly.id)) continue;
        const d = Math.hypot(fly.x - bullet.x, fly.y - bullet.y);
        if (d > fly.radius + bullet.radius) continue;

        bullet.hit.add(fly.id);
        fly.hp -= bullet.damage;

        if (
          this.player.executeLevel > 0 &&
          fly.hp > 0 &&
          fly.hp / fly.maxHp <
            0.12 + this.player.executeLevel * 0.035
        ) {
          fly.hp -= bullet.damage * (0.42 + this.player.executeLevel * 0.12);
        }

        const push = normalize(bullet.vx, bullet.vy);
        fly.x += push.x * this.player.knockback;
        fly.y += push.y * this.player.knockback;
        this.spawnParticles(
          bullet.x,
          bullet.y,
          bullet.style === 'LANCE' ? '#ffffff' : bullet.critical ? '#ffcf57' : '#5beaff',
          bullet.style === 'LANCE' ? 11 : 5,
          bullet.style === 'LANCE' ? 110 : 65,
        );

        if (fly.hp <= 0) this.killFly(fly);

        if (
          this.player.chainChance > 0 &&
          Math.random() < this.player.chainChance
        ) {
          let chainTarget: FlyAgent | null = null;
          let chainDistance = 135;
          for (const other of this.spatial.query(fly.x, fly.y, 135)) {
            if (
              other.id === fly.id ||
              other.hp <= 0 ||
              bullet.hit.has(other.id)
            ) {
              continue;
            }
            const distance = Math.hypot(other.x - fly.x, other.y - fly.y);
            if (distance < chainDistance) {
              chainDistance = distance;
              chainTarget = other;
            }
          }

          if (chainTarget) {
            bullet.hit.add(chainTarget.id);
            chainTarget.hp -= bullet.damage * this.player.chainDamage;
            this.lightningFx.push({
              x1: fly.x,
              y1: fly.y,
              x2: chainTarget.x,
              y2: chainTarget.y,
              life: 0.16,
              maxLife: 0.16,
              color: '#5beaff',
            });
            if (chainTarget.hp <= 0) this.killFly(chainTarget);
          }
        }

        if (
          this.player.ricochetLevel > 0 &&
          Math.random() < 0.12 + this.player.ricochetLevel * 0.06
        ) {
          const target = this.findNearestFly(
            fly.x,
            fly.y,
            230,
            new Set([...bullet.hit, fly.id]),
          );
          if (target) {
            const angle = Math.atan2(target.y - fly.y, target.x - fly.x);
            this.bullets.push({
              x: fly.x,
              y: fly.y,
              vx: Math.cos(angle) * this.player.bulletSpeed * 0.9,
              vy: Math.sin(angle) * this.player.bulletSpeed * 0.9,
              radius: Math.max(3.5, bullet.radius * 0.82),
              life: 0.8,
              damage:
                bullet.damage *
                (0.35 + this.player.ricochetLevel * 0.08),
              pierce: 0,
              hit: new Set<number>([fly.id]),
              critical: false,
              style: 'NORMAL',
            });
          }
        }

        if (bullet.pierce > 0) {
          bullet.pierce -= 1;
        } else {
          bullet.life = 0;
          break;
        }
      }
    }
  }

  private updateAbilities(dt: number) {
    if (this.player.auraDamage > 0 && this.player.auraRadius > 0) {
      const toxinFusionCount = this.fusionCountFor('toxinAura');
      const auraDamage =
        this.player.auraDamage * (1 + toxinFusionCount * 0.18);
      const auraRadius =
        this.player.auraRadius * (1 + toxinFusionCount * 0.045);
      for (const fly of this.spatial.query(
        this.player.x,
        this.player.y,
        auraRadius,
      )) {
        if (fly.hp <= 0) continue;
        if (
          Math.hypot(fly.x - this.player.x, fly.y - this.player.y) <=
          auraRadius
        ) {
          fly.hp -= auraDamage * dt;
          if (fly.hp <= 0) this.killFly(fly);
        }
      }

      if (
        this.boss &&
        Math.hypot(
          this.boss.x - this.player.x,
          this.boss.y - this.player.y,
        ) <= auraRadius + this.boss.radius
      ) {
        this.damageBoss(
          auraDamage * 0.7 * dt * this.player.bossDamage,
        );
      }
    }

    if (this.player.orbitalCount > 0) {
      const orbitalFusionCount = this.fusionCountFor('orbital');
      const resonance = this.evolvedSkills.has('ganglionResonance');
      const toxinHalo = this.evolvedSkills.has('vesicleSecretionHalo');
      const lattice = this.evolvedSkills.has('synapticLattice');

      if (lattice) {
        this.orbitalPulseTimer += dt;
      } else {
        this.orbitalPulseTimer = 0;
      }
      const latticePulse = lattice && this.orbitalPulseTimer >= 0.48;
      if (latticePulse) this.orbitalPulseTimer = 0;

      const orbitalMultiplier =
        1 +
        orbitalFusionCount * 0.35 +
        (resonance ? 0.42 : 0);

      for (let i = 0; i < this.player.orbitalCount; i += 1) {
        const angle =
          this.time * 3.05 +
          (i / this.player.orbitalCount) * TAU;
        const orbitRadius =
          this.player.orbitalCount >= 5 && i % 2 === 1 ? 96 : 70;
        const x = this.player.x + Math.cos(angle) * orbitRadius;
        const y = this.player.y + Math.sin(angle) * orbitRadius;
        const hitRadius = 17;
        const candidates = this.spatial.query(x, y, 38);

        for (const fly of candidates) {
          if (fly.hp <= 0) continue;
          if (Math.hypot(fly.x - x, fly.y - y) < fly.radius + hitRadius) {
            fly.hp -=
              this.player.orbitalDamage *
              8.2 *
              orbitalMultiplier *
              dt;
            if (fly.hp <= 0) this.killFly(fly);
          }
        }

        if (
          this.boss &&
          Math.hypot(this.boss.x - x, this.boss.y - y) <
            this.boss.radius + hitRadius
        ) {
          this.damageBoss(
            this.player.orbitalDamage *
              6.3 *
              orbitalMultiplier *
              dt *
              this.player.bossDamage,
          );
        }

        if (toxinHalo) {
          const haloDps = Math.max(18, this.player.auraDamage * 0.72);
          this.damageCircle(x, y, 46, haloDps * dt);
        }

        if (latticePulse) {
          this.damageCircle(
            x,
            y,
            58,
            this.player.orbitalDamage * 2.6 * orbitalMultiplier,
          );
          this.spawnRing(x, y, 10, 62, '#b8ff70', 0.28, 3);
        }
      }
    } else {
      this.orbitalPulseTimer = 0;
    }

    if (this.player.novaInterval > 0) {
      this.player.novaTimer += dt;
      if (this.player.novaTimer >= this.player.novaInterval) {
        this.player.novaTimer = 0;
        this.novaFlash = 0.5;
        const resonance = this.evolvedSkills.has('ganglionResonance');
        const novaFusionCount = this.fusionCountFor('nova');
        const radius =
          220 *
          (1 + novaFusionCount * 0.075) *
          (resonance ? 1.18 : 1);
        const damage =
          this.player.novaDamage *
          (1 + novaFusionCount * 0.16) *
          (resonance ? 1.22 : 1);
        this.damageCircle(
          this.player.x,
          this.player.y,
          radius,
          damage,
        );

        if (resonance) {
          for (const fly of this.flies) {
            if (fly.hp <= 0) continue;
            const dx = this.player.x - fly.x;
            const dy = this.player.y - fly.y;
            const distance = Math.hypot(dx, dy);
            if (distance > 0 && distance < 500) {
              const pull = 90 * (1 - distance / 500);
              fly.x += (dx / distance) * pull;
              fly.y += (dy / distance) * pull;
            }
          }
        }

        if (
          this.evolvedSkills.has('ganglionWavefront') ||
          this.evolvedSkills.has('depolarizationToxinBurst')
        ) {
          const toxic =
            this.evolvedSkills.has('depolarizationToxinBurst');
          this.damageFields.push({
            x: this.player.x,
            y: this.player.y,
            radius: toxic ? 150 : 135,
            life: toxic ? 3.4 : 2.8,
            maxLife: toxic ? 3.4 : 2.8,
            damage:
              this.player.novaDamage * (toxic ? 0.24 : 0.18),
            pulseTimer: 0,
          });
        }

        this.spawnParticles(
          this.player.x,
          this.player.y,
          resonance ? '#ffffff' : '#5beaff',
          resonance ? 48 : 28,
          resonance ? 240 : 180,
        );
        this.spawnRing(
          this.player.x,
          this.player.y,
          24,
          radius,
          resonance ? '#ffffff' : '#5beaff',
          0.55,
          resonance ? 9 : 5,
        );
        this.screenShake = Math.max(
          this.screenShake,
          resonance ? 11 : 5,
        );
      }
    }

    if (this.player.fieldLevel > 0) {
      this.player.fieldTimer += dt;
      const interval = Math.max(2.8, 5.4 - this.player.fieldLevel * 0.45);
      if (this.player.fieldTimer >= interval) {
        const target = this.findNearestEnemyPosition();
        if (target) {
          this.player.fieldTimer = 0;
          const x = clamp(target.x, 55, WORLD_WIDTH - 55);
          const y = clamp(target.y, 55, WORLD_HEIGHT - 55);
          const fieldFusionCount = this.fusionCountFor('synapticField');
          const baseRadius = 82 + this.player.fieldLevel * 10;
          const baseLife = 4.5 + this.player.fieldLevel * 0.45;
          this.damageFields.push({
            x,
            y,
            radius:
              baseRadius *
              (1 + fieldFusionCount * 0.06) *
              (this.evolvedSkills.has('neuroglialMatrix') ? 1.18 : 1),
            life: baseLife * (1 + fieldFusionCount * 0.05),
            maxLife: baseLife * (1 + fieldFusionCount * 0.05),
            damage:
              (14 + this.player.fieldLevel * 7) *
              (1 + fieldFusionCount * 0.16) *
              (this.evolvedSkills.has('neuroglialMatrix') ? 1.28 : 1),
            pulseTimer: 0,
          });
          this.spawnParticles(
            x,
            y,
            this.evolvedSkills.has('glialCalciumStorm') ? '#ffffff' : '#9cff47',
            this.evolvedSkills.has('glialCalciumStorm') ? 28 : 18,
            this.evolvedSkills.has('glialCalciumStorm') ? 145 : 90,
          );
          this.spawnRing(
            x,
            y,
            12,
            82 + this.player.fieldLevel * 10,
            this.evolvedSkills.has('glialCalciumStorm') ? '#d9f7ff' : '#9cff47',
            0.45,
            4,
          );
        }
      }
    }

    if (this.player.meteorLevel > 0) {
      this.player.meteorTimer += dt;
      const interval =
        Math.max(3.8, 7.3 - this.player.meteorLevel * 0.55) *
        Math.max(0.72, 1 - this.fusionCountFor('meteor') * 0.045);
      if (this.player.meteorTimer >= interval) {
        this.player.meteorTimer = 0;
        this.triggerMeteor();
      }
    }
  }

  private fireEnemyShot(
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    speed: number,
    damage: number,
    color: string,
  ) {
    const direction = normalize(targetX - x, targetY - y);
    this.enemyShots.push({
      x,
      y,
      vx: direction.x * speed,
      vy: direction.y * speed,
      radius: 5,
      damage,
      life: 4.2,
      color,
      bossOwned: false,
    });
  }

  private updateBossStrikes(dt: number) {
    for (const strike of this.bossStrikes) {
      strike.timer -= dt;
      if (strike.timer > 0) continue;

      const distance = Math.hypot(
        this.player.x - strike.x,
        this.player.y - strike.y,
      );
      if (distance <= strike.radius + this.player.radius) {
        this.damagePlayerFromBoss(strike.damage);
      }

      this.callbacks.onSound('bossStrike');
      for (let i = 0; i < 3; i += 1) {
        this.lightningFx.push({
          x1: strike.x + randomRange(-85, 85),
          y1: Math.max(0, strike.y - randomRange(420, 620)),
          x2: strike.x + randomRange(-7, 7),
          y2: strike.y + randomRange(-7, 7),
          life: 0.34,
          maxLife: 0.34,
          color: strike.color,
        });
      }
      this.spawnParticles(strike.x, strike.y, strike.color, 34, 210);
      this.spawnRing(strike.x, strike.y, 12, strike.radius, strike.color, 0.34, 7);
      this.screenShake = Math.max(this.screenShake, 9);
      strike.timer = -999;
    }

    this.bossStrikes = this.bossStrikes.filter(
      (strike) => strike.timer > -100,
    );
  }

  private updateEnemyShots(dt: number) {
    for (const shot of this.enemyShots) {
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.life -= dt;
      if (shot.life <= 0) continue;

      if (
        Math.hypot(shot.x - this.player.x, shot.y - this.player.y) <=
        shot.radius + this.player.radius
      ) {
        if (shot.bossOwned) this.damagePlayerFromBoss(shot.damage);
        else this.damagePlayer(shot.damage);
        this.spawnParticles(shot.x, shot.y, shot.color, 10, 95);
        this.screenShake = Math.max(this.screenShake, 4);
        shot.life = 0;
      }
    }
  }

  private updateDamageFields(dt: number) {
    for (const field of this.damageFields) {
      field.life -= dt;
      field.pulseTimer += dt;
      if (field.life <= 0) continue;

      for (const fly of this.spatial.query(
        field.x,
        field.y,
        field.radius,
      )) {
        if (fly.hp <= 0) continue;
        if (
          Math.hypot(fly.x - field.x, fly.y - field.y) <=
          field.radius + fly.radius
        ) {
          fly.hp -= field.damage * dt;
          if (fly.hp <= 0) this.killFly(fly);
        }
      }

      if (
        this.boss &&
        Math.hypot(this.boss.x - field.x, this.boss.y - field.y) <=
          field.radius + this.boss.radius
      ) {
        this.damageBoss(
          field.damage * 0.72 * dt * this.player.bossDamage,
        );
      }

      const fieldFusionCount = this.fusionCountFor('synapticField');
      if (
        fieldFusionCount > 0 &&
        field.pulseTimer >=
          (this.evolvedSkills.has('glialCalciumStorm') ? 0.95 : 1.35)
      ) {
        field.pulseTimer = 0;
        this.damageCircle(
          field.x,
          field.y,
          field.radius * 0.72,
          field.damage *
            (this.evolvedSkills.has('glialCalciumStorm') ? 1.35 : 0.72),
        );
        this.lightningFx.push({
          x1: field.x + randomRange(-80, 80),
          y1: Math.max(0, field.y - 440),
          x2: field.x,
          y2: field.y,
          life: 0.24,
          maxLife: 0.24,
          color: '#d9f7ff',
        });
        this.spawnRing(
          field.x,
          field.y,
          10,
          field.radius * 0.8,
          '#d9f7ff',
          0.3,
          4,
        );
      }
    }
  }

  private updateVfx(dt: number) {
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
    }
    for (const fx of this.lightningFx) {
      fx.life -= dt;
    }
    for (const fx of this.ringFx) {
      fx.life -= dt;
    }
  }

  private spawnParticles(
    x: number,
    y: number,
    color: string,
    count: number,
    speed: number,
  ) {
    const room = Math.max(0, 520 - this.particles.length);
    const actualCount = Math.min(count, room);
    for (let i = 0; i < actualCount; i += 1) {
      const angle = Math.random() * TAU;
      const velocity = randomRange(speed * 0.25, speed);
      const life = randomRange(0.18, 0.52);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life,
        maxLife: life,
        size: randomRange(1.5, 4.8),
        color,
      });
    }
  }

  private spawnRing(
    x: number,
    y: number,
    startRadius: number,
    endRadius: number,
    color: string,
    life: number,
    lineWidth: number,
  ) {
    this.ringFx.push({
      x,
      y,
      life,
      maxLife: life,
      startRadius,
      endRadius,
      color,
      lineWidth,
    });
  }

  private damageCircle(
    x: number,
    y: number,
    radius: number,
    damage: number,
  ) {
    for (const fly of this.flies) {
      if (
        fly.hp > 0 &&
        Math.hypot(fly.x - x, fly.y - y) <= radius + fly.radius
      ) {
        fly.hp -= damage;
        if (fly.hp <= 0) this.killFly(fly);
      }
    }

    if (
      this.boss &&
      Math.hypot(this.boss.x - x, this.boss.y - y) <=
        radius + this.boss.radius
    ) {
      this.damageBoss(damage * this.player.bossDamage);
    }
  }

  private findNearestEnemyPosition() {
    let bestDistance = Infinity;
    let target: { x: number; y: number } | null = null;

    if (this.boss) {
      const distance = Math.hypot(
        this.boss.x - this.player.x,
        this.boss.y - this.player.y,
      );
      bestDistance = distance;
      target = { x: this.boss.x, y: this.boss.y };
    }

    for (const fly of this.flies) {
      if (fly.hp <= 0) continue;
      const distance = Math.hypot(
        fly.x - this.player.x,
        fly.y - this.player.y,
      );
      if (distance < bestDistance) {
        bestDistance = distance;
        target = { x: fly.x, y: fly.y };
      }
    }

    return target;
  }


  private castAutoLance() {
    if (
      this.player.manualLanceLevel <= 0 ||
      this.player.manualLanceCooldown > 0 ||
      this.pausedForUpgrade ||
      this.gameOver ||
      this.gameCleared
    ) {
      return;
    }

    let targetX = this.aimX;
    let targetY = this.aimY;
    let bestDistance = Infinity;

    if (this.boss) {
      bestDistance = Math.hypot(
        this.boss.x - this.player.x,
        this.boss.y - this.player.y,
      );
      targetX = this.boss.x;
      targetY = this.boss.y;
    }

    for (const fly of this.flies) {
      if (fly.hp <= 0) continue;
      const distance = Math.hypot(
        fly.x - this.player.x,
        fly.y - this.player.y,
      );
      if (distance < bestDistance) {
        bestDistance = distance;
        targetX = fly.x;
        targetY = fly.y;
      }
    }

    if (!Number.isFinite(bestDistance)) return;

    this.callbacks.onSound('axonSpike');

    const level = this.player.manualLanceLevel;
    const fusionCount = this.fusionCountFor('manualLance');
    const propagation = this.evolvedSkills.has('spikePropagation');
    const satellite = this.evolvedSkills.has('axonalSatellite');
    const barrage = this.evolvedSkills.has('synapticBarrage');
    const aim = normalize(targetX - this.player.x, targetY - this.player.y);

    this.player.manualLanceCooldown =
      Math.max(0.38, 1.22 - level * 0.12) *
      Math.max(0.64, 1 - fusionCount * 0.045) *
      (propagation ? 0.82 : 1);

    const speed =
      (860 + level * 55) * (1 + fusionCount * 0.045);
    const damage =
      this.player.damage *
      (2.05 + level * 0.46) *
      (1 + fusionCount * 0.17);
    const pierce = 5 + level * 2 + fusionCount;

    this.bullets.push({
      x: this.player.x + aim.x * 16,
      y: this.player.y + aim.y * 16,
      vx: aim.x * speed,
      vy: aim.y * speed,
      radius: 7 + level * 0.8 + fusionCount * 0.35,
      life: 1.05 + level * 0.08,
      damage,
      pierce,
      hit: new Set<number>(),
      critical: false,
      style: 'LANCE',
    });

    if (satellite) {
      for (const offset of [-0.11, 0.11]) {
        const angle = Math.atan2(aim.y, aim.x) + offset;
        this.bullets.push({
          x: this.player.x,
          y: this.player.y,
          vx: Math.cos(angle) * speed * 0.92,
          vy: Math.sin(angle) * speed * 0.92,
          radius: 5.5,
          life: 0.95,
          damage: damage * 0.48,
          pierce: Math.max(2, Math.floor(pierce / 2)),
          hit: new Set<number>(),
          critical: false,
          style: 'LANCE',
        });
      }
    }

    if (propagation) {
      this.damageCircle(targetX, targetY, 82, damage * 0.42);
      this.spawnRing(targetX, targetY, 8, 92, '#5beaff', 0.3, 5);
    }

    if (
      this.evolvedSkills.has('venomAxon') ||
      this.evolvedSkills.has('axonMesh')
    ) {
      const venom = this.evolvedSkills.has('venomAxon');
      this.damageFields.push({
        x: targetX,
        y: targetY,
        radius: venom ? 82 : 74,
        life: venom ? 3.2 : 2.6,
        maxLife: venom ? 3.2 : 2.6,
        damage: this.player.damage * (venom ? 0.34 : 0.26),
        pulseTimer: 0,
      });
    }

    if (barrage) {
      for (let i = 0; i < 4; i += 1) {
        const angle = (i / 4) * TAU;
        this.bullets.push({
          x: targetX,
          y: targetY,
          vx: Math.cos(angle) * 560,
          vy: Math.sin(angle) * 560,
          radius: 5,
          life: 0.65,
          damage: damage * 0.36,
          pierce: 2,
          hit: new Set<number>(),
          critical: false,
          style: 'LANCE',
        });
      }
    }

    this.spawnParticles(
      this.player.x,
      this.player.y,
      fusionCount > 0 ? '#d9f7ff' : '#ffffff',
      16 + fusionCount * 3,
      125 + fusionCount * 15,
    );
    this.spawnRing(
      this.player.x,
      this.player.y,
      8,
      42 + fusionCount * 7,
      fusionCount > 0 ? '#d9f7ff' : '#ffffff',
      0.22,
      4 + fusionCount * 0.5,
    );
    this.screenShake = Math.max(
      this.screenShake,
      3.2 + fusionCount * 0.55,
    );
  }

  private triggerMeteor() {
    this.callbacks.onSound('calciumCascade');
    let x = this.aimX;
    let y = this.aimY;
    let bestScore = Infinity;

    if (this.boss) {
      x = this.boss.x;
      y = this.boss.y;
    } else {
      for (const fly of this.flies) {
        if (fly.hp <= 0) continue;
        const score = Math.hypot(
          fly.x - this.player.x,
          fly.y - this.player.y,
        );
        if (score < bestScore) {
          bestScore = score;
          x = fly.x;
          y = fly.y;
        }
      }
    }

    const level = this.player.meteorLevel;
    const fusionCount = this.fusionCountFor('meteor');
    const storm = this.evolvedSkills.has('glialCalciumStorm');
    const radius =
      (112 + level * 12) *
      (1 + fusionCount * 0.07) *
      (storm ? 1.16 : 1);
    const damage =
      (66 + level * 30) *
      (1 + fusionCount * 0.18) *
      (storm ? 1.2 : 1);

    this.damageCircle(x, y, radius, damage);

    if (this.evolvedSkills.has('calciumWave')) {
      this.damageCircle(x, y, radius * 0.72, damage * 0.7);
      this.spawnRing(x, y, 10, radius * 1.25, '#5beaff', 0.42, 6);
    }

    if (this.evolvedSkills.has('hemolymphCascade')) {
      this.damageFields.push({
        x,
        y,
        radius: radius * 0.68,
        life: 4,
        maxLife: 4,
        damage: damage * 0.18,
        pulseTimer: 0,
      });
    }

    if (this.evolvedSkills.has('synapticBarrage')) {
      for (let i = 0; i < 8; i += 1) {
        const angle = (i / 8) * TAU;
        this.bullets.push({
          x,
          y,
          vx: Math.cos(angle) * 650,
          vy: Math.sin(angle) * 650,
          radius: 5.5,
          life: 0.8,
          damage: this.player.damage * 1.15,
          pierce: 3,
          hit: new Set<number>(),
          critical: false,
          style: 'LANCE',
        });
      }
    }

    if (this.evolvedSkills.has('glialOrbitalCascade')) {
      for (let i = 0; i < 3; i += 1) {
        const angle = (i / 3) * TAU + this.time;
        const ox = x + Math.cos(angle) * radius * 0.55;
        const oy = y + Math.sin(angle) * radius * 0.55;
        this.damageCircle(
          ox,
          oy,
          42,
          this.player.orbitalDamage * 4.2,
        );
        this.spawnRing(ox, oy, 5, 44, '#5beaff', 0.28, 3);
      }
    }

    const trails = 2 + Math.min(4, fusionCount);
    for (let i = 0; i < trails; i += 1) {
      this.lightningFx.push({
        x1: x + randomRange(-220, 120),
        y1: y - randomRange(390, 560),
        x2: x,
        y2: y,
        life: 0.3,
        maxLife: 0.3,
        color: fusionCount > 0 ? '#ffffff' : '#ffcf57',
      });
    }

    this.spawnParticles(
      x,
      y,
      fusionCount > 0 ? '#ffffff' : '#ffcf57',
      34 + fusionCount * 5,
      205 + fusionCount * 15,
    );
    this.spawnRing(
      x,
      y,
      16,
      radius,
      fusionCount > 0 ? '#d9f7ff' : '#ffcf57',
      0.48,
      6 + fusionCount * 0.6,
    );
    this.screenShake = Math.max(
      this.screenShake,
      9 + fusionCount * 0.8,
    );
  }
  private findNearestFly(
    x: number,
    y: number,
    radius: number,
    exclude = new Set<number>(),
  ) {
    let best: FlyAgent | null = null;
    let bestDistance = radius;
    for (const fly of this.spatial.query(x, y, radius)) {
      if (fly.hp <= 0 || exclude.has(fly.id)) continue;
      const distance = Math.hypot(fly.x - x, fly.y - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = fly;
      }
    }
    return best;
  }

  private killFly(fly: FlyAgent) {
    if (fly.hp > 0 || fly.hp <= -1000) return;
    this.kills += 1;
    const deathColor =
      fly.kind === 'DARTER'
        ? '#5beaff'
        : fly.kind === 'BRUTE'
          ? '#ff704e'
          : fly.kind === 'SPITTER'
            ? '#ff86d7'
            : fly.kind === 'BOMBER'
              ? '#ffcf57'
              : '#c7ff45';
    this.spawnParticles(
      fly.x,
      fly.y,
      deathColor,
      fly.kind === 'BRUTE' ? 16 : 9,
      fly.kind === 'BOMBER' ? 155 : 95,
    );
    fly.hp = -9999;
    this.callbacks.onSound('enemyDeath');
    if (this.player.killHeal > 0) {
      this.player.hp = Math.min(
        this.player.maxHp,
        this.player.hp + this.player.killHeal,
      );
    }
    const xpValue =
      fly.kind === 'BRUTE'
        ? 3
        : fly.kind === 'SPITTER' || fly.kind === 'BOMBER'
          ? 2
          : 1;
    this.orbs.push({
      x: fly.x,
      y: fly.y,
      vx: randomRange(-18, 18),
      vy: randomRange(-18, 18),
      value: xpValue,
    });
    this.maybeDropChest(fly);
    if (this.selectedId === fly.id) this.selectedId = null;
  }

  private killBoss() {
    if (!this.boss) return;

    const boss = this.boss;
    const { x, y, kind, stage, isFinal } = boss;
    const color = this.getBossColor(kind);

    this.spawnParticles(
      x,
      y,
      '#ffffff',
      isFinal ? 150 : 72,
      isFinal ? 390 : 270,
    );
    for (let i = 0; i < (isFinal ? 9 : 4); i += 1) {
      this.lightningFx.push({
        x1: x + randomRange(-260, 260),
        y1: y - randomRange(300, 620),
        x2: x + randomRange(-40, 40),
        y2: y + randomRange(-40, 40),
        life: isFinal ? 0.72 : 0.48,
        maxLife: isFinal ? 0.72 : 0.48,
        color,
      });
    }
    this.spawnRing(
      x,
      y,
      20,
      isFinal ? 520 : 310,
      '#ffffff',
      isFinal ? 1.05 : 0.72,
      isFinal ? 16 : 12,
    );
    this.spawnRing(
      x,
      y,
      30,
      isFinal ? 410 : 220,
      color,
      isFinal ? 0.9 : 0.58,
      isFinal ? 12 : 7,
    );
    this.screenShake = Math.max(
      this.screenShake,
      isFinal ? 30 : 18,
    );
    this.callbacks.onSound('bossDeath');

    if (isFinal) {
      this.mushroomBody.reward(-2.5);
      this.dopamine.reward(-2.5);
      this.finalBossDefeated = true;
      this.finalBossPending = false;
      this.finalBossCountdown = 0;
      this.gameCleared = true;
      this.kills += 250;

      this.boss = null;
      this.enemyShots = [];
      this.bossStrikes = [];
      this.flies = [];
      this.chests = [];
      this.orbs = [];
      this.damageFields = [];
      this.brain.reset();

      this.callbacks.onSound('gameClear');
      this.callbacks.onGameClear({
        kills: this.kills,
        wave: this.wave,
        seconds: this.time,
        bossesDefeated: this.defeatedBosses.size,
        bossesTotal: 5,
        finalBossDefeated: true,
      });
      this.emitHud();
      return;
    }

    this.defeatedBosses.add(kind as CoreBossKind);
    this.dopamine.reward(-2);
    this.dopamine.nextGeneration();

    if (this.player.killHeal > 0) {
      this.player.hp = Math.min(
        this.player.maxHp,
        this.player.hp + this.player.killHeal * 12,
      );
    }

    this.kills += 40 + stage * 15;
    const bossOrbCount = 26 + stage * 7;
    const bossOrbValue = 3 + Math.ceil(stage / 2);
    for (let i = 0; i < bossOrbCount; i += 1) {
      this.orbs.push({
        x: x + randomRange(-34, 34),
        y: y + randomRange(-34, 34),
        vx: randomRange(-110, 110),
        vy: randomRange(-110, 110),
        value: bossOrbValue,
      });
    }

    this.boss = null;
    this.bossStrikes = [];
    this.brain.reset();

    if (this.defeatedBosses.size >= 5) {
      this.beginFinalEncounter();
      return;
    }

    this.nextBossWave = 3 + this.bossIndex * 2;
    this.emitHud();
  }

  private maybeDropChest(fly: FlyAgent) {
    const dropChance =
      fly.kind === 'BRUTE'
        ? 0.035
        : fly.kind === 'SPITTER' || fly.kind === 'BOMBER'
          ? 0.026
          : fly.kind === 'DARTER'
            ? 0.018
            : 0.014;

    if (Math.random() > dropChance) return;

    const rarityRoll = Math.random();
    const rarity: ChestRarity =
      rarityRoll < 0.01
        ? 'MYTHIC'
        : rarityRoll < 0.085
          ? 'RARE'
          : 'COMMON';

    this.chests.push({
      id: this.chestId++,
      x: fly.x,
      y: fly.y,
      radius: rarity === 'MYTHIC' ? 21 : rarity === 'RARE' ? 19 : 17,
      rarity,
      life: rarity === 'MYTHIC' ? 28 : rarity === 'RARE' ? 24 : 20,
      phase: Math.random() * TAU,
    });

    const color =
      rarity === 'MYTHIC'
        ? '#ffd166'
        : rarity === 'RARE'
          ? '#c77dff'
          : '#5beaff';
    this.spawnParticles(fly.x, fly.y, color, rarity === 'MYTHIC' ? 22 : 12, 95);
    this.spawnRing(fly.x, fly.y, 8, 58, color, 0.38, 3);
  }

  private updateChests(dt: number) {
    for (const chest of this.chests) {
      chest.life -= dt;
      if (chest.life <= 0) continue;

      const distance = Math.hypot(
        chest.x - this.player.x,
        chest.y - this.player.y,
      );

      if (distance <= chest.radius + this.player.radius + 9) {
        this.openChest(chest);
        chest.life = 0;
        break;
      }
    }
  }

  private openChest(chest: RewardChest) {
    if (this.pausedForUpgrade || this.gameOver || this.gameCleared) return;

    this.callbacks.onSound(
      chest.rarity === 'MYTHIC'
        ? 'chestMythic'
        : chest.rarity === 'RARE'
          ? 'chestRare'
          : 'chestCommon',
    );

    const options = this.pickChestOptions(chest.rarity);
    if (!options.length) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25);
      return;
    }

    const color =
      chest.rarity === 'MYTHIC'
        ? '#ffd166'
        : chest.rarity === 'RARE'
          ? '#c77dff'
          : '#5beaff';

    this.spawnParticles(
      chest.x,
      chest.y,
      color,
      chest.rarity === 'MYTHIC' ? 52 : chest.rarity === 'RARE' ? 34 : 24,
      chest.rarity === 'MYTHIC' ? 240 : 160,
    );
    this.spawnRing(
      chest.x,
      chest.y,
      12,
      chest.rarity === 'MYTHIC' ? 190 : 130,
      color,
      0.58,
      chest.rarity === 'MYTHIC' ? 9 : 6,
    );
    this.screenShake = Math.max(
      this.screenShake,
      chest.rarity === 'MYTHIC' ? 10 : chest.rarity === 'RARE' ? 6 : 3,
    );

    this.pausedForUpgrade = true;
    const context: RewardContext =
      chest.rarity === 'MYTHIC'
        ? {
            source: 'CHEST_MYTHIC',
            title: 'MYTHIC CACHE',
            subtitle: 'RARE NEURAL REWARD',
          }
        : chest.rarity === 'RARE'
          ? {
              source: 'CHEST_RARE',
              title: 'RARE CACHE',
              subtitle: 'ENHANCED MUTATION REWARD',
            }
          : {
              source: 'CHEST_COMMON',
              title: 'REWARD CACHE',
              subtitle: 'SALVAGED MUTATION',
            };

    this.callbacks.onLevelUp(options, context);
  }

  private pickChestOptions(rarity: ChestRarity) {
    const result: UpgradeOption[] = [];
    const evolutions = evolutionCatalog.filter(
      (item) =>
        !this.evolvedSkills.has(item.key) &&
        this.canEvolve(item),
    );

    if (rarity !== 'COMMON' && evolutions.length) {
      const evolution =
        evolutions[Math.floor(Math.random() * evolutions.length)];
      result.push(this.buildEvolutionOption(evolution));
    }

    let definitions = upgradeCatalog.filter(
      (item) => this.getUpgradeLevel(item.key) < item.maxLevel,
    );

    if (rarity === 'RARE') {
      const boosted = definitions.filter(
        (item) => item.rarity === 'RARE' || item.rarity === 'NEURAL',
      );
      if (boosted.length >= 2) definitions = boosted;
    } else if (rarity === 'MYTHIC') {
      const neural = definitions.filter((item) => item.rarity === 'NEURAL');
      const rare = definitions.filter((item) => item.rarity === 'RARE');
      definitions =
        neural.length + rare.length >= 3
          ? [...neural, ...rare]
          : definitions;
    }

    const pool = definitions.map((item) => this.buildUpgradeOption(item));
    const targetCount = rarity === 'MYTHIC' ? 4 : 3;

    while (result.length < targetCount && pool.length) {
      const index = Math.floor(Math.random() * pool.length);
      result.push(pool.splice(index, 1)[0]);
    }

    return result;
  }

  private updateOrbs(dt: number) {
    for (const orb of this.orbs) {
      const dx = this.player.x - orb.x;
      const dy = this.player.y - orb.y;
      const d = Math.hypot(dx, dy);

      if (orb.value > 0 && d <= this.player.magnet) {
        this.player.xp += orb.value * this.player.xpGain;
        orb.value = 0;
        continue;
      }

      if (d < this.player.magnet * 1.65 && d > 0) {
        const pull =
          420 *
            (1 - d / (this.player.magnet * 1.65)) +
          90;
        orb.vx += (dx / d) * pull * dt;
        orb.vy += (dy / d) * pull * dt;
      }

      orb.vx *= 0.985;
      orb.vy *= 0.985;
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;
    }

    this.orbs = this.orbs.filter((orb) => orb.value > 0);

    if (this.player.xp >= this.player.xpNeed && !this.pausedForUpgrade) {
      this.player.xp -= this.player.xpNeed;
      this.player.level += 1;
      this.player.xpNeed = Math.round(
        7 +
          this.player.level * 3.8 +
          Math.max(0, this.player.level - 12) * 0.8,
      );
      const options = this.pickUpgradeOptions();
      if (options.length) {
        this.pausedForUpgrade = true;
        this.callbacks.onSound('levelUp');
        this.callbacks.onLevelUp(options, {
          source: 'LEVEL_UP',
          title: 'LEVEL UP',
          subtitle: 'CHOOSE A MUTATION',
        });
      } else {
        this.player.hp = Math.min(
          this.player.maxHp,
          this.player.hp + 20,
        );
      }
      this.emitHud();
    }
  }

  private pickUpgradeOptions() {
    const result: UpgradeOption[] = [];

    const evolutions = evolutionCatalog.filter(
      (item) =>
        !this.evolvedSkills.has(item.key) &&
        this.canEvolve(item),
    );

    if (evolutions.length) {
      const evolution =
        evolutions[Math.floor(Math.random() * evolutions.length)];
      result.push(this.buildEvolutionOption(evolution));
    }

    const pool = upgradeCatalog
      .filter(
        (item) =>
          this.getUpgradeLevel(item.key) < item.maxLevel,
      )
      .map((item) => this.buildUpgradeOption(item));

    while (result.length < 3 && pool.length) {
      const index = Math.floor(Math.random() * pool.length);
      result.push(pool.splice(index, 1)[0]);
    }

    return result;
  }

  private evolveSwarm() {
    if (this.flies.length) {
      const avg = this.flies.reduce(
        (acc, fly) => {
          acc.aggression += fly.genome.aggression;
          acc.fear += fly.genome.fear;
          acc.social += fly.genome.social;
          acc.smell += fly.genome.smell;
          acc.speed += fly.genome.speed;
          return acc;
        },
        { aggression: 0, fear: 0, social: 0, smell: 0, speed: 0 },
      );

      const count = this.flies.length;
      for (const key of Object.keys(avg) as (keyof Genome)[]) {
        avg[key] /= count;
      }

      this.swarmGenome = {
        aggression: clamp(
          this.swarmGenome.aggression * 0.72 +
            avg.aggression * 0.28 +
            0.012,
          0.05,
          1,
        ),
        fear: clamp(
          this.swarmGenome.fear * 0.74 +
            avg.fear * 0.26 +
            (this.kills > 80 ? 0.016 : 0),
          0.05,
          1,
        ),
        social: clamp(
          this.swarmGenome.social * 0.72 +
            avg.social * 0.28 +
            0.014,
          0.05,
          1,
        ),
        smell: clamp(
          this.swarmGenome.smell * 0.76 +
            avg.smell * 0.24 +
            0.012,
          0.05,
          1,
        ),
        speed: clamp(
          this.swarmGenome.speed * 0.7 +
            avg.speed * 0.3 +
            0.018,
          0.05,
          1,
        ),
      };
    } else {
      this.swarmGenome.speed = clamp(
        this.swarmGenome.speed + 0.02,
        0.05,
        1,
      );
      this.swarmGenome.aggression = clamp(
        this.swarmGenome.aggression + 0.014,
        0.05,
        1,
      );
    }

    this.evolutionBanner = 3.1;
  }

  private damageBoss(amount: number) {
    if (!this.boss || amount <= 0) return;
    const boss = this.boss;
    const actual = Math.min(boss.hp, amount);
    boss.hp -= actual;
    this.bossPenaltyBuffer += (actual / boss.maxHp) * 7.5;
    if (boss.hp <= 0) this.killBoss();
  }

  private applyPlayerDamage(amount: number) {
    if (amount <= 0) return 0;

    let remaining = amount;
    if (this.player.shield > 0) {
      const absorbed = Math.min(this.player.shield, remaining);
      this.player.shield -= absorbed;
      remaining -= absorbed;
      this.player.shieldCooldown = 4;
    }

    const actual = remaining * (1 - this.player.armor);
    this.player.hp -= actual;
    if (actual > 0) {
      this.player.shieldCooldown = 4;
      this.damageFlash = Math.max(this.damageFlash, 0.16);
      this.screenShake = Math.max(this.screenShake, Math.min(8, 2 + actual * 0.16));
      this.spawnParticles(this.player.x, this.player.y, '#ff5b63', 5, 75);
      this.callbacks.onSound('playerHit');
    }
    return actual;
  }

  private damagePlayerFromBoss(amount: number) {
    if (amount <= 0) return;
    const actual = this.applyPlayerDamage(amount);
    this.bossRewardBuffer += actual / 8;

    if (this.player.hp <= 0) {
      this.dopamine.reward(2.5);
      if (this.boss?.isFinal) {
        this.mushroomBody.reward(2.5);
      }
    }
  }

  private damagePlayer(amount: number) {
    this.applyPlayerDamage(amount);
  }

  private emitHud() {
    let selected: SelectedFly | null = null;
    if (this.selectedId !== null) {
      const fly = this.flies.find((item) => item.id === this.selectedId);
      if (fly && fly.hp > 0) {
        selected = {
          id: fly.id,
          kind: fly.kind,
          decision: fly.decision,
          genome: copyGenome(fly.genome),
          hp: fly.hp,
          maxHp: fly.maxHp,
        };
      }
    }

    const connectome = this.brain.getSnapshot();

    this.callbacks.onHud({
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      level: this.player.level,
      xp: this.player.xp,
      xpNeed: this.player.xpNeed,
      kills: this.kills,
      wave: this.wave,
      seconds: this.time,
      enemyCount: this.flies.length,
      swarmGenome: copyGenome(this.swarmGenome),
      selected,
      connectome,
      abilities: {
        autoLanceLevel: this.player.manualLanceLevel,
        lightningLevel: 0,
        lightningCooldown: 0,
        lightningMaxCooldown: 0,
        xpPickupRadius: this.player.magnet,
      },
      skills: this.getOwnedSkills(),
      bossesDefeated: this.defeatedBosses.size,
      bossesTotal: 5,
      finalBossActive: Boolean(this.boss?.isFinal),
      finalBossDefeated: this.finalBossDefeated,
      finalBossPending: this.finalBossPending,
      finalBossCountdown: this.finalBossCountdown,
      boss: this.boss
        ? {
            active: true,
            kind: this.boss.kind,
            name: this.boss.name,
            hp: this.boss.hp,
            maxHp: this.boss.maxHp,
            stage: this.boss.stage,
            totalStages: 5,
            brain: connectome,
            dopamine: this.dopamine.getSnapshot(),
            isFinal: this.boss.isFinal,
            phase: this.boss.phase,
            mushroomBody: this.boss.isFinal
              ? this.mushroomBody.getSnapshot()
              : null,
          }
        : null,
    });
  }

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    const gradient = ctx.createRadialGradient(
      VIEW_WIDTH / 2,
      VIEW_HEIGHT / 2,
      40,
      VIEW_WIDTH / 2,
      VIEW_HEIGHT / 2,
      760,
    );
    gradient.addColorStop(0, '#101923');
    gradient.addColorStop(1, '#06080c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    const camera = this.getCamera();
    const shakeX =
      this.screenShake > 0 ? randomRange(-this.screenShake, this.screenShake) : 0;
    const shakeY =
      this.screenShake > 0 ? randomRange(-this.screenShake, this.screenShake) : 0;

    ctx.save();
    ctx.translate(shakeX - camera.x, shakeY - camera.y);
    this.drawGrid();
    this.drawDamageFields();
    this.drawChests();
    this.drawOrbs();
    this.drawEnemyShots();
    this.drawBullets();
    this.drawFlies();
    this.drawBoss();
    this.drawPlayer();
    this.drawPlayerAbilities();
    this.drawParticles();
    this.drawRingFx();
    this.drawLightningFx();
    ctx.restore();

    if (this.damageFlash > 0) {
      ctx.fillStyle = `rgba(255,60,70,${Math.min(0.22, this.damageFlash * 0.85)})`;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    }


    if (this.evolutionBanner > 0) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#c7ff45';
      ctx.font = '900 34px Inter, sans-serif';
      ctx.fillText('THE SWARM IS LEARNING', VIEW_WIDTH / 2, 80);
      ctx.fillStyle = 'rgba(255,255,255,.72)';
      ctx.font = '700 14px Inter, sans-serif';
      ctx.fillText(
        `GENERATION ${this.wave} · survivor traits propagated`,
        VIEW_WIDTH / 2,
        107,
      );
      ctx.restore();
    }
  }

  private drawGrid() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.035)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= WORLD_WIDTH; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD_HEIGHT);
      ctx.stroke();
    }

    for (let y = 0; y <= WORLD_HEIGHT; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_WIDTH, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(199,255,69,.16)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    ctx.restore();
  }

  private getCamera() {
    return {
      x: clamp(
        this.player.x - VIEW_WIDTH / 2,
        0,
        Math.max(0, WORLD_WIDTH - VIEW_WIDTH),
      ),
      y: clamp(
        this.player.y - VIEW_HEIGHT / 2,
        0,
        Math.max(0, WORLD_HEIGHT - VIEW_HEIGHT),
      ),
    };
  }

  private drawPlayer() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.player.x, this.player.y);

    ctx.strokeStyle = 'rgba(91, 234, 255, .2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.player.magnet, 0, TAU);
    ctx.stroke();

    if (this.player.auraRadius > 0) {
      ctx.strokeStyle = 'rgba(199,255,69,.18)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.player.auraRadius, 0, TAU);
      ctx.stroke();
    }

    if (this.player.shieldMax > 0 && this.player.shield > 0) {
      const shieldRatio = this.player.shield / this.player.shieldMax;
      ctx.strokeStyle = `rgba(91,234,255,${0.25 + shieldRatio * 0.65})`;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.player.radius + 11, 0, TAU);
      ctx.stroke();
    }

    ctx.fillStyle = '#f5f7fa';
    ctx.beginPath();
    ctx.arc(0, 0, this.player.radius, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = '#5beaff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, this.player.radius + 5, 0, TAU);
    ctx.stroke();

    ctx.fillStyle = '#071017';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  private drawEnemyHpNumber(
    x: number,
    y: number,
    hp: number,
    maxHp: number,
    always = false,
  ) {
    if (!always && hp >= maxHp - 0.01) return;

    const ctx = this.ctx;
    const ratio = clamp(hp / Math.max(1, maxHp), 0, 1);
    const text = `${Math.max(0, Math.ceil(hp))} / ${Math.ceil(maxHp)}`;
    const color =
      ratio > 0.6
        ? '#c7ff45'
        : ratio > 0.3
          ? '#ffcf57'
          : '#ff5b63';

    ctx.save();
    ctx.font = '900 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const width = Math.ceil(ctx.measureText(text).width) + 10;
    const height = 16;

    ctx.fillStyle = 'rgba(4,8,12,.82)';
    ctx.fillRect(x - width / 2, y - height / 2, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - width / 2, y - height / 2, width, height);

    ctx.shadowColor = color;
    ctx.shadowBlur = 5;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y + 0.5);
    ctx.restore();
  }

  private drawFlies() {
    const ctx = this.ctx;

    for (const fly of this.flies) {
      if (fly.hp <= 0) continue;
      ctx.save();
      ctx.translate(fly.x, fly.y);
      ctx.rotate(Math.atan2(fly.vy, fly.vx));

      const scale = fly.radius / 8.5;
      const bodyColor =
        fly.kind === 'DARTER'
          ? '#5beaff'
          : fly.kind === 'BRUTE'
            ? '#ff704e'
            : fly.kind === 'SPITTER'
              ? '#ff86d7'
              : fly.kind === 'BOMBER'
                ? '#ffcf57'
                : fly.decision === 'FLEE'
                  ? '#ffd86b'
                  : fly.decision === 'SWARM'
                    ? '#c7ff45'
                    : '#ff5b63';

      if (this.selectedId === fly.id) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, fly.radius + 8, 0, TAU);
        ctx.stroke();
      }

      if (fly.kind === 'BOMBER') {
        ctx.strokeStyle = `rgba(255,207,87,${0.45 + Math.sin(this.time * 10 + fly.phase) * 0.25})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, fly.radius + 5, 0, TAU);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(230,245,255,.3)';
      ctx.beginPath();
      ctx.ellipse(-2 * scale, -7 * scale, 7 * scale, 3.2 * scale, -0.55, 0, TAU);
      ctx.ellipse(-2 * scale, 7 * scale, 7 * scale, 3.2 * scale, 0.55, 0, TAU);
      ctx.fill();

      ctx.shadowColor = bodyColor;
      ctx.shadowBlur = fly.kind === 'DARTER' || fly.kind === 'BOMBER' ? 10 : 5;
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, 10 * scale, 5.5 * scale, 0, 0, TAU);
      ctx.fill();

      if (fly.kind === 'BRUTE') {
        ctx.strokeStyle = 'rgba(255,255,255,.45)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#171717';
      ctx.beginPath();
      ctx.arc(6.2 * scale, -2.2 * scale, 1.7 * scale, 0, TAU);
      ctx.arc(6.2 * scale, 2.2 * scale, 1.7 * scale, 0, TAU);
      ctx.fill();
      ctx.restore();

      this.drawEnemyHpNumber(
        fly.x,
        fly.y - fly.radius - 15,
        fly.hp,
        fly.maxHp,
      );
    }
  }

  private drawBoss() {
    if (!this.boss) return;
    const ctx = this.ctx;
    const brain = this.brain.getSnapshot();
    const output = brain.output;
    const scale = this.boss.radius / 34;
    const color = this.getBossColor(this.boss.kind);

    ctx.save();
    ctx.translate(this.boss.x, this.boss.y);
    ctx.rotate(this.boss.heading);

    ctx.shadowColor = color;
    ctx.shadowBlur = 20 + output.activity * 18;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.3 + output.activity * 0.7;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, this.boss.radius + 13 + output.activity * 9, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(190,230,255,.38)';
    ctx.beginPath();
    ctx.ellipse(-6 * scale, -28 * scale, 31 * scale, 12 * scale, -0.45, 0, TAU);
    ctx.ellipse(-6 * scale, 28 * scale, 31 * scale, 12 * scale, 0.45, 0, TAU);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 43 * scale, 24 * scale, 0, 0, TAU);
    ctx.fill();

    if (this.boss.kind === 'SWARM_QUEEN') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-22 * scale, (i - 1.5) * 8 * scale);
        ctx.lineTo(-42 * scale, (i - 1.5) * 13 * scale);
        ctx.stroke();
      }
    }

    if (this.boss.kind === 'GLIAL_TITAN') {
      ctx.strokeStyle = '#d7fff1';
      ctx.lineWidth = 2.2;
      for (let i = 0; i < 6; i += 1) {
        const angle = (i / 6) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 18 * scale, Math.sin(angle) * 18 * scale);
        ctx.lineTo(Math.cos(angle) * 39 * scale, Math.sin(angle) * 39 * scale);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 13 * scale, 0, TAU);
      ctx.stroke();
    }

    if (this.boss.kind === 'CONNECTOME_APEX') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.4;
      for (let i = 0; i < 8; i += 1) {
        const angle = (i / 8) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 22 * scale, Math.sin(angle) * 22 * scale);
        ctx.lineTo(Math.cos(angle) * 46 * scale, Math.sin(angle) * 46 * scale);
        ctx.stroke();
      }
      ctx.strokeStyle = '#ff5b63';
      ctx.beginPath();
      ctx.arc(0, 0, 17 * scale, 0, TAU);
      ctx.stroke();
    }

    if (this.boss.kind === 'VIRTUAL_DROSOPHILA') {
      const memory = this.mushroomBody.getSnapshot();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.8;
      for (let i = 0; i < 10; i += 1) {
        const angle = (i / 10) * TAU + this.time * 0.22;
        const inner = 21 * scale;
        const outer =
          (44 + memory.memoryStrength * 26) * scale;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        ctx.stroke();
      }

      ctx.strokeStyle = '#ff4fd8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, (18 + this.boss.phase * 3) * scale, 0, TAU);
      ctx.stroke();

      ctx.strokeStyle = '#8cf5ff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(
        0,
        0,
        (28 + memory.novelty * 12) * scale,
        0,
        TAU,
      );
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a0e12';
    ctx.beginPath();
    ctx.arc(27 * scale, -9 * scale, 7 * scale, 0, TAU);
    ctx.arc(27 * scale, 9 * scale, 7 * scale, 0, TAU);
    ctx.fill();
    ctx.restore();

    const hpWidth = 250;
    ctx.fillStyle = 'rgba(0,0,0,.72)';
    ctx.fillRect(this.boss.x - hpWidth / 2, this.boss.y - this.boss.radius - 38, hpWidth, 10);
    ctx.fillStyle = color;
    ctx.fillRect(
      this.boss.x - hpWidth / 2,
      this.boss.y - this.boss.radius - 38,
      hpWidth * clamp(this.boss.hp / this.boss.maxHp, 0, 1),
      10,
    );
    this.drawEnemyHpNumber(
      this.boss.x,
      this.boss.y - this.boss.radius - 21,
      this.boss.hp,
      this.boss.maxHp,
      true,
    );

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      this.boss.isFinal
        ? `FINAL · PHASE ${this.boss.phase}/3 · ${this.boss.name} · CONNECTOME + MB`
        : `STAGE ${this.boss.stage}/5 · ${this.boss.name} · FULL CONNECTOME`,
      this.boss.x,
      this.boss.y - this.boss.radius - 48,
    );

    if (this.bossPulseFlash > 0) {
      const pulseRadius = this.getBossPulseRadius(this.boss);
      ctx.strokeStyle = `rgba(255,91,99,${this.bossPulseFlash * 1.8})`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(this.boss.x, this.boss.y, pulseRadius, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${this.bossPulseFlash})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.boss.x, this.boss.y, pulseRadius * 0.82, 0, TAU);
      ctx.stroke();
    }
  }

  private drawPlayerAbilities() {
    const ctx = this.ctx;

    if (this.player.orbitalCount > 0) {
      const toxinHalo = this.evolvedSkills.has('vesicleSecretionHalo');
      const lattice = this.evolvedSkills.has('synapticLattice');

      for (let i = 0; i < this.player.orbitalCount; i += 1) {
        const angle =
          this.time * 3.05 +
          (i / this.player.orbitalCount) * TAU;
        const orbitRadius =
          this.player.orbitalCount >= 5 && i % 2 === 1 ? 96 : 70;
        const x = this.player.x + Math.cos(angle) * orbitRadius;
        const y = this.player.y + Math.sin(angle) * orbitRadius;

        if (toxinHalo) {
          ctx.strokeStyle = 'rgba(156,255,135,.34)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, 25, 0, TAU);
          ctx.stroke();
        }
        if (lattice) {
          ctx.strokeStyle = 'rgba(184,255,112,.46)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, 15, 0, TAU);
          ctx.stroke();
        }

        ctx.fillStyle = '#ffcf57';
        ctx.shadowColor = '#ffcf57';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(x, y, 9.5, 0, TAU);
        ctx.fill();

        ctx.fillStyle = '#fff6ca';
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, TAU);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    if (this.novaFlash > 0) {
      const progress = 1 - this.novaFlash / 0.5;
      ctx.strokeStyle = `rgba(91,234,255,${this.novaFlash * 1.8})`;
      ctx.lineWidth = 8 - progress * 5;
      ctx.beginPath();
      ctx.arc(
        this.player.x,
        this.player.y,
        40 + progress * 180,
        0,
        TAU,
      );
      ctx.stroke();
    }
  }

  private drawBullets() {
    const ctx = this.ctx;
    ctx.save();
    for (const bullet of this.bullets) {
      if (bullet.style === 'LANCE') {
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        ctx.rotate(Math.atan2(bullet.vy, bullet.vx));
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = bullet.radius * 1.15;
        ctx.beginPath();
        ctx.moveTo(-34, 0);
        ctx.lineTo(16, 0);
        ctx.stroke();
        ctx.strokeStyle = '#5beaff';
        ctx.lineWidth = Math.max(2, bullet.radius * 0.42);
        ctx.beginPath();
        ctx.moveTo(-48, 0);
        ctx.lineTo(20, 0);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      ctx.shadowBlur = 10;
      ctx.fillStyle = bullet.critical ? '#ffcf57' : '#5beaff';
      ctx.shadowColor = bullet.critical ? '#ffcf57' : '#5beaff';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawDamageFields() {
    const ctx = this.ctx;
    for (const field of this.damageFields) {
      const alpha = clamp(field.life / field.maxLife, 0, 1);
      const gradient = ctx.createRadialGradient(
        field.x,
        field.y,
        10,
        field.x,
        field.y,
        field.radius,
      );
      gradient.addColorStop(0, `rgba(160,255,80,${0.22 * alpha})`);
      gradient.addColorStop(0.72, `rgba(120,220,60,${0.12 * alpha})`);
      gradient.addColorStop(1, 'rgba(120,220,60,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(field.x, field.y, field.radius, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = `rgba(199,255,69,${0.45 * alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  private drawEnemyShots() {
    const ctx = this.ctx;
    ctx.save();
    for (const shot of this.enemyShots) {
      ctx.shadowColor = shot.color;
      ctx.shadowBlur = 16;
      ctx.fillStyle = shot.color;
      ctx.beginPath();
      ctx.arc(shot.x, shot.y, shot.radius, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.32;
      ctx.beginPath();
      ctx.arc(shot.x, shot.y, shot.radius * 2.5, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  private drawParticles() {
    const ctx = this.ctx;
    ctx.save();
    for (const particle of this.particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.fillRect(
        particle.x - particle.size / 2,
        particle.y - particle.size / 2,
        particle.size,
        particle.size,
      );
    }
    ctx.restore();
  }

  private drawRingFx() {
    const ctx = this.ctx;
    ctx.save();
    for (const fx of this.ringFx) {
      const progress = 1 - clamp(fx.life / fx.maxLife, 0, 1);
      const radius =
        fx.startRadius +
        (fx.endRadius - fx.startRadius) * progress;
      const alpha = 1 - progress;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = fx.color;
      ctx.shadowColor = fx.color;
      ctx.shadowBlur = 14 * alpha;
      ctx.lineWidth = Math.max(1, fx.lineWidth * (1 - progress * 0.45));
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, radius, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawLightningFx() {
    const ctx = this.ctx;
    ctx.save();
    for (const fx of this.lightningFx) {
      const alpha = clamp(fx.life / fx.maxLife, 0, 1);
      const segments = 9;
      ctx.strokeStyle = fx.color;
      ctx.shadowColor = fx.color;
      ctx.shadowBlur = 18;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(fx.x1, fx.y1);
      for (let i = 1; i < segments; i += 1) {
        const t = i / segments;
        const x = fx.x1 + (fx.x2 - fx.x1) * t + randomRange(-12, 12);
        const y = fx.y1 + (fx.y2 - fx.y1) * t + randomRange(-12, 12);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(fx.x2, fx.y2);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }
    ctx.restore();
  }


  private drawChests() {
    const ctx = this.ctx;
    ctx.save();

    for (const chest of this.chests) {
      const color =
        chest.rarity === 'MYTHIC'
          ? '#ffd166'
          : chest.rarity === 'RARE'
            ? '#c77dff'
            : '#5beaff';
      const pulse = 1 + Math.sin(this.time * 5 + chest.phase) * 0.08;

      ctx.save();
      ctx.translate(chest.x, chest.y);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = color;
      ctx.shadowBlur = chest.rarity === 'MYTHIC' ? 28 : 16;
      ctx.strokeStyle = color;
      ctx.fillStyle = 'rgba(8,13,18,.94)';
      ctx.lineWidth = chest.rarity === 'MYTHIC' ? 3 : 2;

      const w = chest.radius * 1.6;
      const h = chest.radius * 1.15;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 3);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-w / 2, -2);
      ctx.lineTo(w / 2, -2);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.fillRect(-2.5, -5, 5, 10);

      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, chest.radius + 7, 0, TAU);
      ctx.stroke();

      if (chest.rarity === 'MYTHIC') {
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -chest.radius - 12);
        ctx.lineTo(4, -chest.radius - 5);
        ctx.lineTo(0, -chest.radius + 1);
        ctx.lineTo(-4, -chest.radius - 5);
        ctx.closePath();
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.restore();
  }

  private drawOrbs() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#c7ff45';
    ctx.shadowColor = '#c7ff45';
    ctx.shadowBlur = 9;
    for (const orb of this.orbs) {
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, 4.2 + Math.min(3, orb.value), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  private clientToWorld(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const scale = Math.min(
      rect.width / VIEW_WIDTH,
      rect.height / VIEW_HEIGHT,
    );
    const contentWidth = VIEW_WIDTH * scale;
    const contentHeight = VIEW_HEIGHT * scale;
    const offsetX = (rect.width - contentWidth) / 2;
    const offsetY = (rect.height - contentHeight) / 2;
    const viewX = clamp(
      (clientX - rect.left - offsetX) / Math.max(scale, 0.0001),
      0,
      VIEW_WIDTH,
    );
    const viewY = clamp(
      (clientY - rect.top - offsetY) / Math.max(scale, 0.0001),
      0,
      VIEW_HEIGHT,
    );
    const camera = this.getCamera();
    return {
      x: clamp(viewX + camera.x, 0, WORLD_WIDTH),
      y: clamp(viewY + camera.y, 0, WORLD_HEIGHT),
    };
  }

  private pointerWorld(event: MouseEvent) {
    return this.clientToWorld(event.clientX, event.clientY);
  }

  private onKeyDown = (event: KeyboardEvent) => {
    const block = [
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
    ];
    if (block.includes(event.code)) event.preventDefault();

    this.keys.add(event.code);
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };

  private onCanvasMove = (event: MouseEvent) => {
    const point = this.pointerWorld(event);
    this.aimX = point.x;
    this.aimY = point.y;
  };

  private onCanvasTouch = (event: TouchEvent) => {
    if (!event.touches.length) return;
    event.preventDefault();
    const touch = event.touches[0];
    const point = this.clientToWorld(touch.clientX, touch.clientY);
    this.aimX = point.x;
    this.aimY = point.y;
  };

  private onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    const point = this.pointerWorld(event);
    this.aimX = point.x;
    this.aimY = point.y;
  };

  private onCanvasClick = (event: MouseEvent) => {
    const point = this.pointerWorld(event);
    const x = point.x;
    const y = point.y;
    this.aimX = x;
    this.aimY = y;

    let nearest: FlyAgent | null = null;
    let best = 34;
    for (const fly of this.flies) {
      const d = Math.hypot(fly.x - x, fly.y - y);
      if (d < best) {
        best = d;
        nearest = fly;
      }
    }

    this.selectedId = nearest?.id ?? null;
    this.emitHud();
  };
}
