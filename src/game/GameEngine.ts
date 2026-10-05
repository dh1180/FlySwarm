import { SpatialHash } from './SpatialHash';
import { WholeBrainController } from './connectome/WholeBrainController';
import type {
  Bullet,
  FlyAgent,
  GameOverSnapshot,
  Genome,
  HudSnapshot,
  Orb,
  Player,
  SelectedFly,
  UpgradeKey,
  UpgradeOption,
} from './types';

const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 720;
const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1350;
const WAVE_SECONDS = 28;
const TAU = Math.PI * 2;
const BOSS_HIT_ID = -1;

type Boss = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  heading: number;
  pulseCooldown: number;
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

const upgradeCatalog: UpgradeOption[] = [
  { key: 'damage', title: 'Heavy Shot', description: '투사체 피해량 +25%', rarity: 'COMMON' },
  { key: 'firerate', title: 'Synapse Rush', description: '자동 공격 주기 -18%', rarity: 'COMMON' },
  { key: 'multishot', title: 'Split Signal', description: '동시 발사 투사체 +1', rarity: 'RARE' },
  { key: 'speed', title: 'Motor Cortex', description: '이동속도 +12%', rarity: 'COMMON' },
  { key: 'health', title: 'Thick Skin', description: '최대 체력 +25 및 즉시 회복', rarity: 'COMMON' },
  { key: 'pierce', title: 'Axon Piercer', description: '투사체 관통 횟수 +1', rarity: 'RARE' },
  { key: 'magnet', title: 'Dopamine Field', description: '경험치 흡수 반경 +35', rarity: 'COMMON' },
  { key: 'bulletSpeed', title: 'Fast Conduction', description: '투사체 속도 +20%', rarity: 'COMMON' },
  { key: 'bulletSize', title: 'Giant Vesicle', description: '투사체 크기 +1.2', rarity: 'COMMON' },
  { key: 'crit', title: 'Burst Firing', description: '치명타 확률 +8%', rarity: 'RARE' },
  { key: 'regen', title: 'Homeostasis', description: '초당 체력 재생 +0.65', rarity: 'RARE' },
  { key: 'armor', title: 'Chitin Layer', description: '받는 피해 5% 감소', rarity: 'RARE' },
  { key: 'knockback', title: 'Motor Shock', description: '적 넉백 +22', rarity: 'COMMON' },
  { key: 'orbital', title: 'Satellite Neuron', description: '플레이어 주변 공격 오비탈 +1', rarity: 'NEURAL' },
  { key: 'nova', title: 'Action Potential Nova', description: '주기적인 광역 신경 펄스 획득/강화', rarity: 'NEURAL' },
  { key: 'xpGain', title: 'Memory Consolidation', description: '경험치 획득량 +25%', rarity: 'RARE' },
  { key: 'bossDamage', title: 'Connectome Breaker', description: '전체뇌 보스 피해량 +25%', rarity: 'NEURAL' },
];

type Callbacks = {
  onHud: (hud: HudSnapshot) => void;
  onLevelUp: (options: UpgradeOption[]) => void;
  onGameOver: (result: GameOverSnapshot) => void;
};

export class GameEngine {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly spatial = new SpatialHash(76);
  private readonly keys = new Set<string>();
  private readonly callbacks: Callbacks;
  private readonly brain = new WholeBrainController();

  private raf = 0;
  private running = false;
  private pausedForUpgrade = false;
  private gameOver = false;
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
  private selectedId: number | null = null;
  private nextBossWave = 3;
  private bossBrainTimer = 0;

  private player: Player = this.makePlayer();
  private flies: FlyAgent[] = [];
  private bullets: Bullet[] = [];
  private orbs: Orb[] = [];
  private boss: Boss | null = null;
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
    this.emitHud();
    this.render();
  }

  start() {
    if (this.running) return;
    this.brain.load();
    this.running = true;
    this.gameOver = false;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  restart() {
    this.player = this.makePlayer();
    this.flies = [];
    this.bullets = [];
    this.orbs = [];
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
    this.selectedId = null;
    this.nextBossWave = 3;
    this.bossBrainTimer = 0;
    this.pausedForUpgrade = false;
    this.gameOver = false;
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

  applyUpgrade(key: UpgradeKey) {
    switch (key) {
      case 'damage':
        this.player.damage *= 1.25;
        break;
      case 'firerate':
        this.player.fireInterval = Math.max(0.07, this.player.fireInterval * 0.82);
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
        this.player.critChance = Math.min(0.52, this.player.critChance + 0.08);
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
        this.player.orbitalCount = Math.min(6, this.player.orbitalCount + 1);
        this.player.orbitalDamage += 1.5;
        break;
      case 'nova':
        if (this.player.novaInterval <= 0) {
          this.player.novaInterval = 7;
          this.player.novaDamage = 58;
          this.player.novaTimer = 0;
        } else {
          this.player.novaInterval = Math.max(2.6, this.player.novaInterval * 0.86);
          this.player.novaDamage *= 1.22;
        }
        break;
      case 'xpGain':
        this.player.xpGain += 0.25;
        break;
      case 'bossDamage':
        this.player.bossDamage *= 1.25;
        break;
    }
    this.pausedForUpgrade = false;
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.brain.destroy();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('click', this.onCanvasClick);
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
      orbitalDamage: 10,
      novaInterval: 0,
      novaTimer: 0,
      novaDamage: 0,
      xpGain: 1,
      bossDamage: 1,
    };
  }

  private loop = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.033, (now - this.last) / 1000);
    this.last = now;

    if (!this.pausedForUpgrade && !this.gameOver) {
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

    const nextWave = Math.floor(this.time / WAVE_SECONDS) + 1;
    if (nextWave > this.wave) {
      this.wave = nextWave;
      this.evolveSwarm();
    }

    const brainSnapshot = this.brain.getSnapshot();
    if (
      !this.boss &&
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
    this.spatial.rebuild(this.flies);
    this.updateShooting();
    this.updateBullets(dt);
    this.updateAbilities(dt);
    this.updateOrbs(dt);

    this.flies = this.flies.filter((fly) => fly.hp > 0);
    this.bullets = this.bullets.filter((bullet) => bullet.life > 0);

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.gameOver = true;
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

    if (dx || dy) {
      const n = normalize(dx, dy);
      this.player.x += n.x * this.player.speed * dt;
      this.player.y += n.y * this.player.speed * dt;
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
    const bossTax = this.boss ? 0.72 : 1;
    const cap = Math.floor(Math.min(360, 48 + this.wave * 24) * bossTax);
    const interval = Math.max(0.075, 0.43 - this.wave * 0.024);

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

    const mutate = (value: number, amount = 0.18) =>
      clamp(value + randomRange(-amount, amount), 0.05, 1);

    const genome: Genome = {
      aggression: mutate(this.swarmGenome.aggression),
      fear: mutate(this.swarmGenome.fear),
      social: mutate(this.swarmGenome.social),
      smell: mutate(this.swarmGenome.smell),
      speed: mutate(this.swarmGenome.speed, 0.14),
    };

    const hp = 26 + this.wave * 3.4;
    return {
      id: this.flyId++,
      x,
      y,
      vx: 0,
      vy: 0,
      hp,
      maxHp: hp,
      radius: 8.5,
      phase: Math.random() * TAU,
      genome,
      decision: 'WANDER',
    };
  }

  private updateFlies(dt: number) {
    for (const fly of this.flies) {
      if (fly.hp <= 0) continue;

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

      if (fleeScore > chaseScore && fleeScore > swarmScore && nearestBullet) {
        fly.decision = 'FLEE';
        const away = normalize(fly.x - nearestBullet.x, fly.y - nearestBullet.y);
        desiredX = away.x;
        desiredY = away.y;
      } else if (swarmScore > chaseScore * 0.84 && neighbors.length) {
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

      const speed =
        (84 + fly.genome.speed * 88 + this.wave * 3.6) *
        (fly.decision === 'FLEE' ? 1.14 : 1);
      const steer = clamp(dt * 5.2, 0, 1);
      fly.vx += (desired.x * speed - fly.vx) * steer;
      fly.vy += (desired.y * speed - fly.vy) * steer;
      fly.x += fly.vx * dt;
      fly.y += fly.vy * dt;

      if (playerDistance < this.player.radius + fly.radius + 5) {
        const contactDps = 9 + this.wave * 1.2 + fly.genome.aggression * 4;
        this.damagePlayer(contactDps * dt);
        fly.x -= towardPlayer.x * 42 * dt;
        fly.y -= towardPlayer.y * 42 * dt;
      }
    }
  }

  private spawnBoss() {
    const maxHp = 1050 + this.wave * 330;
    const camera = this.getCamera();
    this.boss = {
      x: clamp(camera.x + VIEW_WIDTH / 2, 80, WORLD_WIDTH - 80),
      y: clamp(camera.y + 92, 80, WORLD_HEIGHT - 80),
      vx: 0,
      vy: 0,
      radius: 34,
      hp: maxHp,
      maxHp,
      heading: Math.PI / 2,
      pulseCooldown: 1.6,
    };
    this.bossBrainTimer = 0;
    this.brain.reset();
  }

  private updateBoss(dt: number) {
    if (!this.boss) return;
    const boss = this.boss;
    const brain = this.brain.getSnapshot();
    if (brain.status !== 'ready') return;

    this.bossBrainTimer += dt;
    boss.pulseCooldown = Math.max(0, boss.pulseCooldown - dt);

    if (this.bossBrainTimer >= 0.32) {
      this.bossBrainTimer = 0;
      const dx = this.player.x - boss.x;
      const dy = this.player.y - boss.y;
      const distance = Math.hypot(dx, dy) || 1;

      let nearestBullet = Infinity;
      for (const bullet of this.bullets) {
        nearestBullet = Math.min(
          nearestBullet,
          Math.hypot(bullet.x - boss.x, bullet.y - boss.y),
        );
      }

      const bulletThreat = Number.isFinite(nearestBullet)
        ? clamp(1 - nearestBullet / 210, 0, 1)
        : 0;
      const towardPlayer = normalize(dx, dy);
      const rightX = -Math.sin(boss.heading);
      const rightY = Math.cos(boss.heading);
      // fly-brain-bench convention: negative = left eye, positive = right eye.
      const side = clamp(
        towardPlayer.x * rightX + towardPlayer.y * rightY,
        -1,
        1,
      );
      const proximity = clamp(1 - distance / 1050, 0, 1);
      const threat = clamp(0.08 + proximity * 0.62 + bulletThreat * 0.78, 0, 1);
      this.brain.step(side, threat);
    }

    const out = this.brain.getSnapshot().output;
    const dx = this.player.x - boss.x;
    const dy = this.player.y - boss.y;
    const distance = Math.hypot(dx, dy) || 1;

    boss.heading += out.turn * 4.2 * dt;
    const forward = {
      x: Math.cos(boss.heading),
      y: Math.sin(boss.heading),
    };

    // Descending-neuron readouts dominate locomotion; no hidden chase vector.
    let drive =
      out.forward * 230 +
      out.wing * 85 +
      out.escape * 260 -
      out.stop * 150 -
      out.backward * 185;
    drive = clamp(drive, -125, 310);

    const desiredX = forward.x * drive;
    const desiredY = forward.y * drive;

    const responsiveness = clamp(dt * 3.8, 0, 1);
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
      this.damagePlayer((25 + this.wave * 1.8) * dt);
    }

    if (
      boss.pulseCooldown <= 0 &&
      (out.activity > 0.52 || out.wing > 0.48)
    ) {
      boss.pulseCooldown = 2.4;
      this.bossPulseFlash = 0.42;
      if (distance < 205) {
        this.damagePlayer(10 + this.wave * 1.4);
      }
    }
  }

  private updateShooting() {
    if (this.shootTimer < this.player.fireInterval) return;
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
        life: 1.35,
        damage:
          this.player.damage *
          (critical ? this.player.critMultiplier : 1),
        pierce: this.player.pierce,
        hit: new Set<number>(),
        critical,
      });
    }
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
        this.boss.hp -= bullet.damage * this.player.bossDamage;
        const push = normalize(bullet.vx, bullet.vy);
        this.boss.vx += push.x * this.player.knockback * 0.15;
        this.boss.vy += push.y * this.player.knockback * 0.15;

        if (this.boss.hp <= 0) this.killBoss();

        if (bullet.pierce > 0) bullet.pierce -= 1;
        else {
          bullet.life = 0;
          continue;
        }
      }

      const candidates = this.spatial.query(bullet.x, bullet.y, 26);
      for (const fly of candidates) {
        if (fly.hp <= 0 || bullet.hit.has(fly.id)) continue;
        const d = Math.hypot(fly.x - bullet.x, fly.y - bullet.y);
        if (d > fly.radius + bullet.radius) continue;

        bullet.hit.add(fly.id);
        fly.hp -= bullet.damage;
        const push = normalize(bullet.vx, bullet.vy);
        fly.x += push.x * this.player.knockback;
        fly.y += push.y * this.player.knockback;

        if (fly.hp <= 0) this.killFly(fly);

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
    if (this.player.orbitalCount > 0) {
      for (let i = 0; i < this.player.orbitalCount; i += 1) {
        const angle =
          this.time * 2.1 +
          (i / this.player.orbitalCount) * TAU;
        const x = this.player.x + Math.cos(angle) * 74;
        const y = this.player.y + Math.sin(angle) * 74;
        const candidates = this.spatial.query(x, y, 22);

        for (const fly of candidates) {
          if (fly.hp <= 0) continue;
          if (Math.hypot(fly.x - x, fly.y - y) < fly.radius + 10) {
            fly.hp -= this.player.orbitalDamage * 6 * dt;
            if (fly.hp <= 0) this.killFly(fly);
          }
        }

        if (
          this.boss &&
          Math.hypot(this.boss.x - x, this.boss.y - y) <
            this.boss.radius + 10
        ) {
          this.boss.hp -=
            this.player.orbitalDamage *
            4 *
            dt *
            this.player.bossDamage;
          if (this.boss.hp <= 0) this.killBoss();
        }
      }
    }

    if (this.player.novaInterval > 0) {
      this.player.novaTimer += dt;
      if (this.player.novaTimer >= this.player.novaInterval) {
        this.player.novaTimer = 0;
        this.novaFlash = 0.5;
        const radius = 220;

        for (const fly of this.flies) {
          if (
            fly.hp > 0 &&
            Math.hypot(fly.x - this.player.x, fly.y - this.player.y) <= radius
          ) {
            fly.hp -= this.player.novaDamage;
            if (fly.hp <= 0) this.killFly(fly);
          }
        }

        if (
          this.boss &&
          Math.hypot(
            this.boss.x - this.player.x,
            this.boss.y - this.player.y,
          ) <= radius + this.boss.radius
        ) {
          this.boss.hp -=
            this.player.novaDamage * this.player.bossDamage;
          if (this.boss.hp <= 0) this.killBoss();
        }
      }
    }
  }

  private killFly(fly: FlyAgent) {
    if (fly.hp > 0) return;
    this.kills += 1;
    fly.hp = -9999;
    this.orbs.push({
      x: fly.x,
      y: fly.y,
      vx: randomRange(-18, 18),
      vy: randomRange(-18, 18),
      value: 1,
    });
    if (this.selectedId === fly.id) this.selectedId = null;
  }

  private killBoss() {
    if (!this.boss) return;
    const { x, y } = this.boss;
    this.kills += 50;
    for (let i = 0; i < 26; i += 1) {
      this.orbs.push({
        x: x + randomRange(-28, 28),
        y: y + randomRange(-28, 28),
        vx: randomRange(-100, 100),
        vy: randomRange(-100, 100),
        value: 3,
      });
    }
    this.boss = null;
    this.nextBossWave = this.wave + 3;
    this.brain.reset();
  }

  private updateOrbs(dt: number) {
    for (const orb of this.orbs) {
      const dx = this.player.x - orb.x;
      const dy = this.player.y - orb.y;
      const d = Math.hypot(dx, dy) || 1;

      if (d < this.player.magnet) {
        const pull = 680 * (1 - d / this.player.magnet) + 130;
        orb.vx += (dx / d) * pull * dt;
        orb.vy += (dy / d) * pull * dt;
      }

      orb.vx *= 0.985;
      orb.vy *= 0.985;
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;

      if (d < this.player.radius + 10 && orb.value > 0) {
        this.player.xp += orb.value * this.player.xpGain;
        orb.value = 0;
      }
    }

    this.orbs = this.orbs.filter((orb) => orb.value > 0);

    if (this.player.xp >= this.player.xpNeed && !this.pausedForUpgrade) {
      this.player.xp -= this.player.xpNeed;
      this.player.level += 1;
      this.player.xpNeed = Math.round(8 + this.player.level * 4.7);
      this.pausedForUpgrade = true;
      this.callbacks.onLevelUp(this.pickUpgradeOptions());
      this.emitHud();
    }
  }

  private pickUpgradeOptions() {
    const pool = [...upgradeCatalog];
    const result: UpgradeOption[] = [];
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

  private damagePlayer(amount: number) {
    this.player.hp -= amount * (1 - this.player.armor);
  }

  private emitHud() {
    let selected: SelectedFly | null = null;
    if (this.selectedId !== null) {
      const fly = this.flies.find((item) => item.id === this.selectedId);
      if (fly && fly.hp > 0) {
        selected = {
          id: fly.id,
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
      boss: this.boss
        ? {
            active: true,
            hp: this.boss.hp,
            maxHp: this.boss.maxHp,
            brain: connectome,
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
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    this.drawGrid();
    this.drawOrbs();
    this.drawBullets();
    this.drawFlies();
    this.drawBoss();
    this.drawPlayer();
    this.drawPlayerAbilities();
    ctx.restore();

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

  private drawFlies() {
    const ctx = this.ctx;

    for (const fly of this.flies) {
      if (fly.hp <= 0) continue;
      ctx.save();
      ctx.translate(fly.x, fly.y);
      ctx.rotate(Math.atan2(fly.vy, fly.vx));

      if (this.selectedId === fly.id) {
        ctx.strokeStyle = '#5beaff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, TAU);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(230,245,255,.26)';
      ctx.beginPath();
      ctx.ellipse(-2, -7, 7, 3.2, -0.55, 0, TAU);
      ctx.ellipse(-2, 7, 7, 3.2, 0.55, 0, TAU);
      ctx.fill();

      ctx.fillStyle =
        fly.decision === 'FLEE'
          ? '#ffcf57'
          : fly.decision === 'SWARM'
            ? '#c7ff45'
            : '#ff5b63';
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 5.5, 0, 0, TAU);
      ctx.fill();

      ctx.fillStyle = '#171717';
      ctx.beginPath();
      ctx.arc(6.2, -2.2, 1.7, 0, TAU);
      ctx.arc(6.2, 2.2, 1.7, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawBoss() {
    if (!this.boss) return;
    const ctx = this.ctx;
    const brain = this.brain.getSnapshot();
    const output = brain.output;

    ctx.save();
    ctx.translate(this.boss.x, this.boss.y);
    ctx.rotate(this.boss.heading);

    ctx.strokeStyle = `rgba(199,255,69,${0.25 + output.activity * 0.75})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, this.boss.radius + 13 + output.activity * 9, 0, TAU);
    ctx.stroke();

    ctx.fillStyle = 'rgba(190,230,255,.36)';
    ctx.beginPath();
    ctx.ellipse(-6, -28, 31, 12, -0.45, 0, TAU);
    ctx.ellipse(-6, 28, 31, 12, 0.45, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#c7ff45';
    ctx.beginPath();
    ctx.ellipse(0, 0, 43, 24, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#0a0e12';
    ctx.beginPath();
    ctx.arc(27, -9, 7, 0, TAU);
    ctx.arc(27, 9, 7, 0, TAU);
    ctx.fill();

    ctx.restore();

    const hpWidth = 240;
    ctx.fillStyle = 'rgba(0,0,0,.7)';
    ctx.fillRect(this.boss.x - hpWidth / 2, this.boss.y - 68, hpWidth, 9);
    ctx.fillStyle = '#c7ff45';
    ctx.fillRect(
      this.boss.x - hpWidth / 2,
      this.boss.y - 68,
      hpWidth * clamp(this.boss.hp / this.boss.maxHp, 0, 1),
      9,
    );
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FULL CONNECTOME BOSS', this.boss.x, this.boss.y - 77);

    if (this.bossPulseFlash > 0) {
      ctx.strokeStyle = `rgba(255,91,99,${this.bossPulseFlash * 2})`;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(this.boss.x, this.boss.y, 205, 0, TAU);
      ctx.stroke();
    }
  }

  private drawPlayerAbilities() {
    const ctx = this.ctx;

    if (this.player.orbitalCount > 0) {
      for (let i = 0; i < this.player.orbitalCount; i += 1) {
        const angle =
          this.time * 2.1 +
          (i / this.player.orbitalCount) * TAU;
        const x = this.player.x + Math.cos(angle) * 74;
        const y = this.player.y + Math.sin(angle) * 74;
        ctx.fillStyle = '#ffcf57';
        ctx.shadowColor = '#ffcf57';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, TAU);
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
    ctx.shadowBlur = 10;
    for (const bullet of this.bullets) {
      ctx.fillStyle = bullet.critical ? '#ffcf57' : '#5beaff';
      ctx.shadowColor = bullet.critical ? '#ffcf57' : '#5beaff';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, TAU);
      ctx.fill();
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

  private onKeyDown = (event: KeyboardEvent) => {
    const block = [
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Space',
    ];
    if (block.includes(event.code)) event.preventDefault();
    this.keys.add(event.code);
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };

  private onCanvasClick = (event: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const camera = this.getCamera();
    const x =
      ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH + camera.x;
    const y =
      ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT + camera.y;

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
