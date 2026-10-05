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
};

const pct = (value: number) => `${Math.round(value * 100)}%`;

export default function FlySwarmGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [started, setStarted] = useState(false);
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

    return () => engine.destroy();
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

  return (
    <section className="game-shell">
      <div className="game-topbar">
        <div>
          <span>LIVE EXPERIMENT</span>
          <strong>HUMAN VS ARTIFICIAL FRUIT-FLY SWARM</strong>
        </div>
        <div className="topbar-stats">
          <b>WAVE {hud.wave}</b>
          <b>{hud.kills} KILLS</b>
          <b>{Math.floor(hud.seconds)}s</b>
          <b>{hud.enemyCount} AGENTS</b>
        </div>
      </div>

      <div className="canvas-wrap">
        <canvas ref={canvasRef} aria-label="FlySwarm game canvas" />

        {!started && (
          <div className="game-overlay intro-overlay">
            <span className="fly-icon">🪰</span>
            <p>EVERY FLY THINKS FOR ITSELF.</p>
            <h2>SURVIVE<br/>THE SWARM.</h2>
            <p className="overlay-copy">
              WASD / 방향키로 이동하세요.<br/>
              공격은 자동입니다. 초파리를 클릭하면 개체의 AI 성향을 볼 수 있습니다.
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
                <button key={upgrade.key} onClick={() => chooseUpgrade(upgrade.key)}>
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
          <strong>{hud.xp} / {hud.xpNeed} XP</strong>
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
          <span>AGENT INSPECTOR</span>
          <p>게임 화면에서 초파리 한 마리를 클릭하세요.</p>
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
          <div className="agent-empty">NO AGENT SELECTED</div>
        )}
      </div>
    </section>
  );
}
