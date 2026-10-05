import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../game/GameEngine';
import type {
  GameOverSnapshot,
  HudSnapshot,
  UpgradeKey,
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
  const engineRef = useRef<GameEngine | null>(null);
  const [started, setStarted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [hud, setHud] = useState(initialHud);
  const [upgrades, setUpgrades] = useState<UpgradeOption[]>([]);
  const [gameOver, setGameOver] = useState<GameOverSnapshot | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current, {
      onHud: setHud,
      onLevelUp: setUpgrades,
      onGameOver: setGameOver,
    });
    engineRef.current = engine;

    const syncFullscreen = () => {
      setFullscreen(document.fullscreenElement === shellRef.current);
    };
    document.addEventListener('fullscreenchange', syncFullscreen);

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      engine.destroy();
    };
  }, []);

  const start = () => {
    setStarted(true);
    setGameOver(null);
    engineRef.current?.start();
  };

  const restart = () => {
    setStarted(true);
    setGameOver(null);
    setUpgrades([]);
    engineRef.current?.restart();
  };

  const chooseUpgrade = (key: UpgradeKey) => {
    engineRef.current?.applyUpgrade(key);
    setUpgrades([]);
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
          <div className="topbar-stats">
            <b>WAVE {hud.wave}</b>
            <b>{hud.kills} KILLS</b>
            <b>{Math.floor(hud.seconds)}s</b>
            <b>{hud.enemyCount} AGENTS</b>
            <b className={`brain-badge ${hud.connectome.status}`}>{brainLabel}</b>
          </div>
        </div>
      </div>

      {hud.boss && (
        <div className="boss-strip">
          <div>
            <span>⚠ CONNECTOME ENTITY DETECTED</span>
            <strong>FULL-BRAIN BOSS</strong>
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

        {!started && (
          <div className="game-overlay intro-overlay">
            <span className="fly-icon">🪰</span>
            <p>EVERY FLY THINKS. THE BOSS GETS THE WHOLE BRAIN.</p>
            <h2>SURVIVE<br/>THE SWARM.</h2>
            <p className="overlay-copy">
              WASD / 방향키로 이동하세요. 공격은 자동입니다.<br/>
              일반몹은 Utility AI, 보스는 FlyWire 전체 연결망 기반 LIF controller를 사용합니다.<br/>
              전체뇌 데이터 약 30.7MB는 게임 시작 후 백그라운드에서 불러옵니다.
            </p>
            <button onClick={start}>ENTER THE SWARM</button>
          </div>
        )}

        {upgrades.length > 0 && (
          <div className="game-overlay upgrade-overlay">
            <span className="level-label">LEVEL {hud.level}</span>
            <h2>CHOOSE A MUTATION</h2>
            <div className="upgrade-grid">
              {upgrades.map((upgrade) => (
                <button
                  key={upgrade.key}
                  className={`upgrade-card rarity-${upgrade.rarity.toLowerCase()}`}
                  onClick={() => chooseUpgrade(upgrade.key)}
                >
                  <em>{upgrade.rarity}</em>
                  <span>{upgrade.title}</span>
                  <small>{upgrade.description}</small>
                </button>
              ))}
            </div>
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

      <div className="agent-inspector">
        <div>
          <span>AGENT / CONNECTOME INSPECTOR</span>
          <p>
            일반 초파리를 클릭하면 Utility AI 성향을 확인할 수 있습니다.
            전체뇌 보스의 신경 출력은 상단 보스 패널에서 표시됩니다.
          </p>
        </div>

        {hud.selected ? (
          <div className="agent-data">
            <strong>FLY #{hud.selected.id}</strong>
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
