import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { GameEngine } from '../game/GameEngine';
import { AudioManager } from '../audio/AudioManager';
import SkillIcon from './SkillIcon';
import type {
  GameClearSnapshot,
  GameOverSnapshot,
  HudSnapshot,
  RewardContext,
  SkillKey,
  UpgradeOption,
} from '../game/types';

const initialHud: HudSnapshot = {
  hp: 100,
  maxHp: 100,
  level: 1,
  xp: 0,
  xpNeed: 9,
  kills: 0,
  wave: 1,
  seconds: 0,
  enemyCount: 0,
  swarmGenome: {
    aggression: 0.56,
    fear: 0.35,
    social: 0.52,
    smell: 0.62,
    speed: 0.5,
  },
  selected: null,
  boss: null,
  abilities: {
    autoLanceLevel: 0,
    lightningLevel: 0,
    lightningCooldown: 0,
    lightningMaxCooldown: 0,
    xpPickupRadius: 115,
  },
  skills: [],
  bossesDefeated: 0,
  bossesTotal: 3,
  connectome: {
    status: 'idle',
    progress: 0,
    neurons: 0,
    pairs: 0,
    synapses: 0,
    error: null,
    output: {
      turn: 0,
      forward: 0,
      backward: 0,
      escape: 0,
      stop: 0,
      wing: 0,
      activity: 0,
      spikes: 0,
    },
  },
};

const pct = (value: number) => `${Math.round(value * 100)}%`;

export default function FlySwarmGame() {
  const shellRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const joystickRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const audioRef = useRef<AudioManager | null>(null);
  const [started, setStarted] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [sfxOn, setSfxOn] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [hud, setHud] = useState(initialHud);
  const [upgrades, setUpgrades] = useState<UpgradeOption[]>([]);
  const [rewardContext, setRewardContext] = useState<RewardContext>({
    source: 'LEVEL_UP',
    title: 'LEVEL UP',
    subtitle: 'CHOOSE A MUTATION',
  });
  const [gameOver, setGameOver] = useState<GameOverSnapshot | null>(null);
  const [gameClear, setGameClear] = useState<GameClearSnapshot | null>(null);
  const [joystick, setJoystick] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!canvasRef.current) return;

    const audio = new AudioManager();
    audioRef.current = audio;

    const engine = new GameEngine(canvasRef.current, {
      onHud: setHud,
      onLevelUp: (options, context) => {
        setRewardContext(context);
        setUpgrades(options);
      },
      onGameOver: setGameOver,
      onGameClear: setGameClear,
      onSound: (event) => audio.play(event),
    });
    engineRef.current = engine;

    const syncFullscreen = () => {
      setFullscreen(document.fullscreenElement === shellRef.current);
    };
    document.addEventListener('fullscreenchange', syncFullscreen);

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      engine.destroy();
      audio.destroy();
      audioRef.current = null;
    };
  }, []);

  const activateAudio = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    await audio.unlock();
    audio.startMusic();
  };

  const start = () => {
    setStarted(true);
    setGameOver(null);
    setGameClear(null);
    void activateAudio();
    engineRef.current?.start();
  };

  const restart = () => {
    setStarted(true);
    setGameOver(null);
    setGameClear(null);
    setUpgrades([]);
    setRewardContext({
      source: 'LEVEL_UP',
      title: 'LEVEL UP',
      subtitle: 'CHOOSE A MUTATION',
    });
    void activateAudio();
    engineRef.current?.restart();
  };

  const chooseUpgrade = (key: SkillKey) => {
    setUpgrades([]);
    setRewardContext({
      source: 'LEVEL_UP',
      title: 'LEVEL UP',
      subtitle: 'CHOOSE A MUTATION',
    });
    engineRef.current?.applyUpgrade(key);
  };

  const cancelFusion = () => {
    engineRef.current?.cancelFusionOffer();
    setUpgrades([]);
    setRewardContext({
      source: 'LEVEL_UP',
      title: 'LEVEL UP',
      subtitle: 'CHOOSE A MUTATION',
    });
  };

  const toggleMusic = () => {
    const next = !musicOn;
    setMusicOn(next);
    const audio = audioRef.current;
    if (!audio) return;
    audio.setMusicEnabled(next);
    if (next) void activateAudio();
  };

  const toggleSfx = () => {
    const next = !sfxOn;
    setSfxOn(next);
    const audio = audioRef.current;
    if (!audio) return;
    audio.setSfxEnabled(next);
    if (next) void audio.unlock();
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await shellRef.current?.requestFullscreen();
      }
    } catch {
      // Browser or embedding context may disallow fullscreen.
    }
  };

  const updateJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = joystickRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    let x =
      (event.clientX - (rect.left + rect.width / 2)) /
      (rect.width / 2);
    let y =
      (event.clientY - (rect.top + rect.height / 2)) /
      (rect.height / 2);

    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }

    setJoystick({ x, y });
    engineRef.current?.setTouchMove(x, y);
  };

  const startJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    updateJoystick(event);
  };

  const endJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setJoystick({ x: 0, y: 0 });
    engineRef.current?.setTouchMove(0, 0);
  };



  const brainLabel =
    hud.connectome.status === 'ready'
      ? `FULL BRAIN ${hud.connectome.neurons.toLocaleString()}N`
      : hud.connectome.status === 'loading'
        ? `BRAIN LOADING ${Math.round(hud.connectome.progress * 100)}%`
        : hud.connectome.status === 'error'
          ? 'BRAIN LOAD ERROR'
          : 'BRAIN IDLE';

  return (
    <section className="game-shell" ref={shellRef}>
      <div className="game-topbar">
        <div>
          <span>LIVE EXPERIMENT</span>
          <strong>HUMAN VS ARTIFICIAL SWARM + FULL-CONNECTOME BOSS</strong>
        </div>

        <div className="topbar-actions">
          <div className="audio-controls" aria-label="Audio controls">
            <button
              type="button"
              className={`audio-toggle ${musicOn ? 'on' : 'off'}`}
              onClick={toggleMusic}
              aria-pressed={musicOn}
            >
              MUSIC <b>{musicOn ? 'ON' : 'OFF'}</b>
            </button>
            <button
              type="button"
              className={`audio-toggle ${sfxOn ? 'on' : 'off'}`}
              onClick={toggleSfx}
              aria-pressed={sfxOn}
            >
              SFX <b>{sfxOn ? 'ON' : 'OFF'}</b>
            </button>
          </div>
          <div className="topbar-stats">
            <b>WAVE {hud.wave}</b>
            <b>{hud.kills} KILLS</b>
            <b>{Math.floor(hud.seconds)}s</b>
            <b>{hud.enemyCount} AGENTS</b>
            <b>BOSSES {hud.bossesDefeated}/{hud.bossesTotal}</b>
            <b className={`brain-badge ${hud.connectome.status}`}>{brainLabel}</b>
          </div>
        </div>
      </div>

      {hud.boss && (
        <div className="boss-strip">
          <div>
            <span>⚠ CONNECTOME ENTITY DETECTED</span>
            <strong>{hud.boss.name}</strong>
          </div>
          <div className="boss-hp">
            <i
              style={{
                width: `${Math.max(0, (hud.boss.hp / hud.boss.maxHp) * 100)}%`,
              }}
            />
          </div>
          <div className="neural-readout">
            <b>TURN {hud.boss.brain.output.turn.toFixed(2)}</b>
            <b>MOVE {pct(hud.boss.brain.output.forward)}</b>
            <b>ESC {pct(hud.boss.brain.output.escape)}</b>
            <b>ACT {pct(hud.boss.brain.output.activity)}</b>
            <b className="dopamine-readout">
              DOP {hud.boss.dopamine.recentReward >= 0 ? '+' : ''}
              {hud.boss.dopamine.recentReward.toFixed(2)}
            </b>
            <b>GEN {hud.boss.dopamine.generation}</b>
            <b>LEARN {hud.boss.dopamine.updates}</b>
            <b>PRETRAIN {(hud.boss.dopamine.pretrainedEpisodes / 1000).toFixed(0)}K</b>
          </div>
        </div>
      )}

      <div className="canvas-wrap">
        <canvas ref={canvasRef} aria-label="FlySwarm game canvas" />
        <button
          className="fullscreen-fab"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? '전체화면 종료' : '전체화면으로 플레이'}
        >
          <span>{fullscreen ? '✕' : '⛶'}</span>
          {fullscreen ? 'EXIT FULLSCREEN' : 'PLAY FULLSCREEN'}
        </button>

        {started && !gameOver && !gameClear && (
          <div className="combat-controls">
            <span>MOVE <b>WASD</b></span>
            <span>AIM <b>MOUSE</b></span>
            <span>AXONAL SPIKE <b>AUTO</b></span>
          </div>
        )}

        {started && !gameOver && !gameClear && (
          <>
            <div
              ref={joystickRef}
              className="mobile-joystick"
              onPointerDown={startJoystick}
              onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  updateJoystick(event);
                }
              }}
              onPointerUp={endJoystick}
              onPointerCancel={endJoystick}
            >
              <span
                className="mobile-joystick-knob"
                style={{
                  transform: `translate(${joystick.x * 34}px, ${joystick.y * 34}px)`,
                }}
              />
            </div>

            <div className="ability-dock">
              <div className="xp-pickup-readout">
                XP PICKUP <b>{Math.round(hud.abilities.xpPickupRadius)}</b>
              </div>
            </div>
          </>
        )}

        {!started && (
          <div className="game-overlay intro-overlay">
            <span className="fly-icon">🪰</span>
            <p>EVERY FLY THINKS. THE BOSS GETS THE WHOLE BRAIN.</p>
            <h2>SURVIVE<br/>THE SWARM.</h2>
            <p className="overlay-copy">
              WASD / 방향키로 이동하세요. 기본 공격은 자동입니다. 시작과 함께 Neural Pulse soundtrack이 재생됩니다.<br/>
              Axonal Spike는 획득 후 가장 가까운 적을 자동으로 공격하고, Glial Matrix는 마우스/터치 방향을 참고해 생성됩니다.<br/>
              공격 스킬 두 개가 MAX가 되는 순간 가능한 Synaptic Fusion을 바로 제안하며, 원하지 않으면 나중으로 미룰 수 있습니다.<br/>
              일반몹은 5개 전투 아키타입의 Utility AI, 보스 3종은 FlyWire 전체 연결망 기반 LIF controller를 사용합니다.<br/>
              보스는 120,000-step 사전학습 정책에서 시작하고, 실제 플레이에서는 도파민형 보상으로 계속 미세조정됩니다.<br/>
              플레이어에게 피해를 주면 보상, 피격되면 패널티를 받으며 학습값은 다음 보스전에도 이어집니다.
            </p>
            <button onClick={start}>ENTER THE SWARM</button>
          </div>
        )}

        {upgrades.length > 0 && (
          <div className={`game-overlay upgrade-overlay reward-${rewardContext.source.toLowerCase()}`}>
            <span className="level-label">
              {rewardContext.source === 'LEVEL_UP'
                ? `LEVEL ${hud.level}`
                : rewardContext.subtitle}
            </span>
            <h2>{rewardContext.title}</h2>
            <div className="upgrade-grid">
              {upgrades.map((upgrade) => (
                <button
                  key={upgrade.key}
                  className={`upgrade-card rarity-${upgrade.rarity.toLowerCase()}`}
                  onClick={() => chooseUpgrade(upgrade.key)}
                >
                  <div className="upgrade-icon-wrap">
                    <SkillIcon skill={upgrade.key} size={44} />
                  </div>
                  <em>
                    {upgrade.rarity}
                    {upgrade.isEvolution
                      ? ' · FUSION'
                      : ` · Lv ${upgrade.level} → ${upgrade.nextLevel}/${upgrade.maxLevel}`}
                  </em>
                  <span>{upgrade.title}</span>
                  <small>{upgrade.description}</small>
                  <strong className="upgrade-detail">{upgrade.detail}</strong>
                  {upgrade.requirements && (
                    <small className="upgrade-requirements">
                      MAX: {upgrade.requirements.join(' + ')}
                    </small>
                  )}
                </button>
              ))}
            </div>
            {rewardContext.source === 'FUSION_OFFER' && (
              <button
                type="button"
                className="fusion-cancel"
                onClick={cancelFusion}
              >
                NOT NOW · KEEP BOTH MAX SKILLS
              </button>
            )}
          </div>
        )}

        {gameClear && (
          <div className="game-overlay clear-overlay">
            <span className="fly-icon">🧠⚡</span>
            <p>CONNECTOME SWARM CLEARED</p>
            <h2>HUMAN<br/>SURVIVED.</h2>
            <div className="death-stats">
              <span><b>{gameClear.bossesDefeated}/3</b> bosses eliminated</span>
              <span><b>{gameClear.kills}</b> total kills</span>
              <span><b>{Math.floor(gameClear.seconds)}s</b> clear time</span>
            </div>
            <strong className="clear-copy">
              세 개의 Full-Connectome Boss를 모두 처치했습니다.
            </strong>
            <button onClick={restart}>PLAY AGAIN</button>
          </div>
        )}

        {gameOver && (
          <div className="game-overlay death-overlay">
            <span className="fly-icon">🪰</span>
            <p>YOU DIED</p>
            <h2>THE SWARM<br/>WON.</h2>
            <div className="death-stats">
              <span><b>{gameOver.kills}</b> flies eliminated</span>
              <span><b>{gameOver.wave}</b> generation reached</span>
              <span><b>{Math.floor(gameOver.seconds)}s</b> survived</span>
            </div>
            <strong className="shame">인간은 정말 지구의 지배종이 맞습니까?</strong>
            <button onClick={restart}>TRY AGAIN</button>
          </div>
        )}
      </div>

      <div className="hud-row">
        <div className="hud-card vital-card">
          <span>HUMAN</span>
          <div className="bar">
            <i className="hp" style={{ width: `${(hud.hp / hud.maxHp) * 100}%` }} />
          </div>
          <strong>{Math.ceil(hud.hp)} / {hud.maxHp} HP</strong>
        </div>

        <div className="hud-card vital-card">
          <span>LEVEL {hud.level}</span>
          <div className="bar">
            <i className="xp" style={{ width: `${(hud.xp / hud.xpNeed) * 100}%` }} />
          </div>
          <strong>{Math.floor(hud.xp)} / {hud.xpNeed} XP</strong>
        </div>

        <div className="hud-card genome-card">
          <span>SWARM GENOME</span>
          <div className="genome-values">
            <b>AGR {pct(hud.swarmGenome.aggression)}</b>
            <b>FEAR {pct(hud.swarmGenome.fear)}</b>
            <b>SOC {pct(hud.swarmGenome.social)}</b>
            <b>SPD {pct(hud.swarmGenome.speed)}</b>
          </div>
        </div>
      </div>

      <div className="skill-rack">
        <div className="skill-rack-head">
          <span>ACQUIRED SKILLS</span>
          <b>{hud.skills.length} TYPES</b>
        </div>
        <div className="skill-chips">
          {hud.skills.length ? (
            hud.skills.map((skill) => (
              <div
                key={skill.key}
                className={`skill-chip rarity-${skill.rarity.toLowerCase()} ${skill.evolved ? 'evolved' : ''}`}
              >
                <div className="skill-chip-main">
                  <SkillIcon skill={skill.key} size={25} />
                  <span>{skill.title}</span>
                </div>
                <b>
                  {skill.evolved
                    ? 'EVOLVED'
                    : skill.level >= skill.maxLevel
                      ? `MAX ${skill.level}/${skill.maxLevel}`
                      : `Lv ${skill.level}/${skill.maxLevel}`}
                </b>
              </div>
            ))
          ) : (
            <span className="skill-empty">아직 획득한 스킬이 없습니다.</span>
          )}
        </div>
      </div>

      <div className="agent-inspector">
        <div>
          <span>AGENT / CONNECTOME INSPECTOR</span>
          <p>
            일반 초파리를 클릭하면 Utility AI 성향을 확인할 수 있습니다.
            Darter / Brute / Spitter / Bomber 등 개체 타입도 확인할 수 있습니다.
            전체뇌 보스의 신경 출력과 Boss Archetype은 상단 보스 패널에서 표시됩니다.
          </p>
        </div>

        {hud.selected ? (
          <div className="agent-data">
            <strong>{hud.selected.kind} #{hud.selected.id}</strong>
            <em>{hud.selected.decision}</em>
            <span>HP {Math.ceil(hud.selected.hp)} / {Math.ceil(hud.selected.maxHp)}</span>
            <span>Aggression {pct(hud.selected.genome.aggression)}</span>
            <span>Fear {pct(hud.selected.genome.fear)}</span>
            <span>Social {pct(hud.selected.genome.social)}</span>
            <span>Smell {pct(hud.selected.genome.smell)}</span>
            <span>Speed {pct(hud.selected.genome.speed)}</span>
          </div>
        ) : (
          <div className="agent-data connectome-data">
            <strong>{brainLabel}</strong>
            {hud.connectome.status === 'ready' && (
              <>
                <span>{hud.connectome.pairs.toLocaleString()} PAIRS</span>
                <span>{hud.connectome.synapses.toLocaleString()} SYNAPSES</span>
                <span>{hud.connectome.output.spikes} RECENT SPIKES</span>
              </>
            )}
            {hud.connectome.error && <em>{hud.connectome.error}</em>}
          </div>
        )}
      </div>
    </section>
  );
}
