import { SpatialHash } from './SpatialHash';
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

const WIDTH = 1280;
const HEIGHT = 720;
const WAVE_SECONDS = 28;
const TAU = Math.PI * 2;

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
  { key: 'damage', title: 'Heavy Shot', description: '투사체 피해량 +25%' },
  { key: 'firerate', title: 'Synapse Rush', description: '자동 공격 주기 -18%' },
  { key: 'multishot', title: 'Split Signal', description: '한 번에 발사하는 투사체 +1' },
  { key: 'speed', title: 'Motor Cortex', description: '이동속도 +12%' },
  { key: 'health', title: 'Thick Skin', description: '최대 체력 +25 및 즉시 회복' },
  { key: 'pierce', title: 'Piercing Pulse', description: '투사체 관통 횟수 +1' },
  { key: 'magnet', title: 'Dopamine Field', description: '경험치 흡수 반경 +35' },
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
  private wave = 1;
  private kills = 0;
  private flyId = 1;
  private selectedId: number | null = null;

  private player: Player = this.makePlayer();
  private flies: FlyAgent[] = [];
  private bullets: Bullet[] = [];
  private orbs: Orb[] = [];
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
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('click', this.onCanvasClick);
    this.emitHud();
    this.render();
  }

  start() {
    if (this.running) return;
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
    this.time = 0;
    this.hudTimer = 0;
    this.spawnTimer = 0;
    this.shootTimer = 0;
    this.evolutionBanner = 0;
    this.wave = 1;
    this.kills = 0;
    this.flyId = 1;
    this.selectedId = null;
    this.pausedForUpgrade = false;
    this.gameOver = false;
    this.swarmGenome = {
      aggression: 0.56,
      fear: 0.35,
      social: 0.52,
      smell: 0.62,
      speed: 0.5,
    };
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
        this.player.fireInterval = Math.max(0.085, this.player.fireInterval * 0.82);
        break;
      case 'multishot':
        this.player.bulletCount += 1;
        break;
      case 'speed':
        this.player.speed *= 1.12;
        break;
      case 'health':
        this.player.maxHp += 25;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 35);
        break;
      case 'pierce':
        this.player.pierce += 1;
        break;
      case 'magnet':
        this.player.magnet += 35;
        break;
    }
    this.pausedForUpgrade = false;
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('click', this.onCanvasClick);
  }

  private makePlayer(): Player {
    return {
      x: WIDTH / 2,
      y: HEIGHT / 2,
      radius: 14,
      hp: 100,
      maxHp: 100,
      speed: 250,
      damage: 24,
      fireInterval: 0.34,
      bulletSpeed: 650,
      bulletCount: 1,
      pierce: 0,
      magnet: 115,
      level: 1,
      xp: 0,
      xpNeed: 9,
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

    const nextWave = Math.floor(this.time / WAVE_SECONDS) + 1;
    if (nextWave > this.wave) {
      this.wave = nextWave;
      this.evolveSwarm();
    }

    this.updatePlayer(dt);
    this.spawnFlies();
    this.spatial.rebuild(this.flies);
    this.updateFlies(dt);
    this.spatial.rebuild(this.flies);
    this.updateShooting();
    this.updateBullets(dt);
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

    this.player.x = clamp(this.player.x, 22, WIDTH - 22);
    this.player.y = clamp(this.player.y, 22, HEIGHT - 22);
  }

  private spawnFlies() {
    const cap = Math.min(360, 48 + this.wave * 24);
    const interval = Math.max(0.075, 0.43 - this.wave * 0.024);

    while (this.spawnTimer >= interval && this.flies.length < cap) {
      this.spawnTimer -= interval;
      this.flies.push(this.createFly());
    }
  }

  private createFly(): FlyAgent {
    const side = Math.floor(Math.random() * 4);
    const margin = 28;
    let x = 0;
    let y = 0;

    if (side === 0) {
      x = randomRange(0, WIDTH);
      y = -margin;
    } else if (side === 1) {
      x = WIDTH + margin;
      y = randomRange(0, HEIGHT);
    } else if (side === 2) {
      x = randomRange(0, WIDTH);
      y = HEIGHT + margin;
    } else {
      x = -margin;
      y = randomRange(0, HEIGHT);
    }

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
        this.player.hp -= contactDps * dt;
        fly.x -= towardPlayer.x * 42 * dt;
        fly.y -= towardPlayer.y * 42 * dt;
      }
    }
  }

  private updateShooting() {
    if (this.shootTimer < this.player.fireInterval || !this.flies.length) return;
    this.shootTimer = 0;

    let target: FlyAgent | null = null;
    let best = Infinity;
    for (const fly of this.flies) {
      if (fly.hp <= 0) continue;
      const d2 =
        (fly.x - this.player.x) ** 2 +
        (fly.y - this.player.y) ** 2;
      if (d2 < best) {
        best = d2;
        target = fly;
      }
    }

    if (!target) return;
    const base = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    const count = this.player.bulletCount;

    for (let i = 0; i < count; i += 1) {
      const offset =
        count === 1 ? 0 : (i - (count - 1) / 2) * Math.min(0.17, 0.42 / count);
      const angle = base + offset;
      this.bullets.push({
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(angle) * this.player.bulletSpeed,
        vy: Math.sin(angle) * this.player.bulletSpeed,
        radius: 4.5,
        life: 1.35,
        damage: this.player.damage,
        pierce: this.player.pierce,
        hit: new Set<number>(),
      });
    }
  }

  private updateBullets(dt: number) {
    for (const bullet of this.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;

      const candidates = this.spatial.query(bullet.x, bullet.y, 26);
      for (const fly of candidates) {
        if (fly.hp <= 0 || bullet.hit.has(fly.id)) continue;
        const d = Math.hypot(fly.x - bullet.x, fly.y - bullet.y);
        if (d > fly.radius + bullet.radius) continue;

        bullet.hit.add(fly.id);
        fly.hp -= bullet.damage;

        if (fly.hp <= 0) {
          this.killFly(fly);
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

  private killFly(fly: FlyAgent) {
    this.kills += 1;
    this.orbs.push({
      x: fly.x,
      y: fly.y,
      vx: randomRange(-18, 18),
      vy: randomRange(-18, 18),
      value: 1,
    });
    if (this.selectedId === fly.id) this.selectedId = null;
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

      if (d < this.player.radius + 10) {
        orb.value = 0;
        this.player.xp += 1;
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
        aggression: clamp(this.swarmGenome.aggression * 0.72 + avg.aggression * 0.28 + 0.012, 0.05, 1),
        fear: clamp(this.swarmGenome.fear * 0.74 + avg.fear * 0.26 + (this.kills > 80 ? 0.016 : 0), 0.05, 1),
        social: clamp(this.swarmGenome.social * 0.72 + avg.social * 0.28 + 0.014, 0.05, 1),
        smell: clamp(this.swarmGenome.smell * 0.76 + avg.smell * 0.24 + 0.012, 0.05, 1),
        speed: clamp(this.swarmGenome.speed * 0.7 + avg.speed * 0.3 + 0.018, 0.05, 1),
      };
    } else {
      this.swarmGenome.speed = clamp(this.swarmGenome.speed + 0.02, 0.05, 1);
      this.swarmGenome.aggression = clamp(this.swarmGenome.aggression + 0.014, 0.05, 1);
    }

    this.evolutionBanner = 3.1;
  }

  private emitHud() {
    let selected: SelectedFly | null = null;
    if (this.selectedId !== null) {
      const fly = this.flies.find((item) => item.id === this.selectedId);
      if (fly) {
        selected = {
          id: fly.id,
          decision: fly.decision,
          genome: copyGenome(fly.genome),
          hp: fly.hp,
          maxHp: fly.maxHp,
        };
      }
    }

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
    });
  }

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    const gradient = ctx.createRadialGradient(
      WIDTH / 2,
      HEIGHT / 2,
      40,
      WIDTH / 2,
      HEIGHT / 2,
      760,
    );
    gradient.addColorStop(0, '#101923');
    gradient.addColorStop(1, '#06080c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    this.drawGrid();
    this.drawOrbs();
    this.drawBullets();
    this.drawFlies();
    this.drawPlayer();

    if (this.evolutionBanner > 0) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#c7ff45';
      ctx.font = '900 34px Inter, sans-serif';
      ctx.fillText('THE SWARM IS LEARNING', WIDTH / 2, 80);
      ctx.fillStyle = 'rgba(255,255,255,.72)';
      ctx.font = '700 14px Inter, sans-serif';
      ctx.fillText(`GENERATION ${this.wave} · survivor traits propagated`, WIDTH / 2, 107);
      ctx.restore();
    }
  }

  private drawGrid() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.035)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= WIDTH; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }

    for (let y = 0; y <= HEIGHT; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }
    ctx.restore();
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

  private drawBullets() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#5beaff';
    ctx.shadowColor = '#5beaff';
    ctx.shadowBlur = 10;
    for (const bullet of this.bullets) {
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
      ctx.arc(orb.x, orb.y, 4.2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  private onKeyDown = (event: KeyboardEvent) => {
    const block = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
    if (block.includes(event.code)) event.preventDefault();
    this.keys.add(event.code);
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };

  private onCanvasClick = (event: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * HEIGHT;

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
