import FlySwarmGame from './components/FlySwarmGame';

const BrainBlock = ({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) => (
  <article className="brain-block">
    <span>{number}</span>
    <h3>{title}</h3>
    <p>{body}</p>
  </article>
);

export default function App() {
  return (
    <main>
      <nav className="nav">
        <a href="#top" className="brand">
          <span className="brand-fly">🪰</span>
          <b>FlySwarm</b>
          <em>CONNECTOME SURVIVAL</em>
        </a>
        <div>
          <a href="#experiment">EXPERIMENT</a>
          <a href="#brain">BRAIN MODEL</a>
          <a href="https://github.com/dh1180/FlySwarm" target="_blank" rel="noreferrer">
            GITHUB ↗
          </a>
        </div>
      </nav>

      <header className="hero" id="top">
        <div className="hero-kicker">MULTI-AGENT SURVIVAL EXPERIMENT // BUILD 002</div>
        <div className="hero-layout">
          <div>
            <h1>
              A SWARM.<br/>
              <span>ONE REAL WIRING DIAGRAM.</span>
            </h1>
            <p>
              일반 초파리는 가벼운 Utility AI로 수백 마리를 동시에 처리합니다.
              그러나 보스는 다릅니다. FlyWire FAFB v783에서 파생된 전체 연결 그래프를
              Web Worker에서 leaky integrate-and-fire 방식으로 실행하고, 그 descending
              neuron 출력이 실제 보스의 이동과 회피에 사용됩니다.
            </p>
          </div>
          <div className="hero-stat">
            <small>FULL-BRAIN SOURCE GRAPH</small>
            <strong>138,639</strong>
            <i>NEURONS · 15,091,983 PAIRS · 54,492,922 SYNAPSES</i>
          </div>
        </div>
      </header>

      <section className="experiment" id="experiment">
        <div className="section-heading">
          <span>01 / LIVE EXPERIMENT</span>
          <h2>THE BOSS<br/>HAS A BRAIN.</h2>
          <p>
            게임 시작과 함께 전체 connectome을 백그라운드에서 로드합니다.
            3웨이브부터 보스가 등장하며, LPLC2 시각 입력에서 시작된 활동이
            전체 뇌 연결망을 통과한 뒤 descending/motor 출력으로 게임 동작에 반영됩니다.
          </p>
        </div>
        <FlySwarmGame />
      </section>

      <section className="brain-section" id="brain">
        <div className="section-heading dark-heading">
          <span>02 / TWO AI LAYERS</span>
          <h2>SWARM AI.<br/>WHOLE-BRAIN BOSS.</h2>
          <p>
            수백 개 일반몹에는 계산량이 가벼운 군집 AI를 사용하고,
            단 하나의 보스에만 전체 FlyWire source graph를 사용합니다.
          </p>
        </div>

        <div className="brain-grid">
          <BrainBlock
            number="01"
            title="UTILITY SWARM"
            body="일반몹은 플레이어 거리, 투사체 위협, 주변 개체 밀도와 personality genome을 이용해 CHASE/FLEE/SWARM을 고릅니다."
          />
          <BrainBlock
            number="02"
            title="FULL CONNECTOME"
            body="보스 Worker는 source graph의 138,639 neuron slots와 15,091,983 directed pairs를 전부 로드합니다. 약한 pair를 별도로 제거하지 않는 Full profile입니다."
          />
          <BrainBlock
            number="03"
            title="LIF DYNAMICS"
            body="각 뉴런은 단순한 leaky integrate-and-fire 상태를 가지며, 측정된 연결 수와 presynaptic neurotransmitter sign에서 만든 고정 가중치로 활동이 전달됩니다."
          />
          <BrainBlock
            number="04"
            title="SENSORY INPUT"
            body="게임의 플레이어 방향과 위협 강도를 좌우 LPLC2 population에 합성 시각 입력으로 주입합니다."
          />
          <BrainBlock
            number="05"
            title="MOTOR READOUT"
            body="DNa02, DNa01/DNb01/DNg13, MDN, DNp01, DNp09 등의 spike output을 turn, forward, backward, escape, stop 동작으로 매핑합니다."
          />
          <BrainBlock
            number="06"
            title="NOT A MIND UPLOAD"
            body="전체 wiring diagram을 사용하지만 감각 입력, LIF 파라미터와 게임 body mapping은 공학적으로 설계된 근사입니다. 실제 초파리의 정신이나 완전한 생물학적 행동 재현이 아닙니다."
          />
        </div>
      </section>

      <section className="warning-section">
        <span>SCIENTIFIC NOTE</span>
        <p>
          FlyWire의 공식 FAFB v783에는 139,255개의 proofread neuron이 보고되어 있습니다.
          FlySwarm 보스가 사용하는 공개 simulation source pack은 그중 연결 그래프에 포함된
          <b> 138,639 neuron index와 15,091,983 directed pairs를 모두 보존한 모델 입력</b>입니다.
          따라서 “전체 connectome source graph”를 사용하지만 생물학적 뇌 전체 기능을 완벽하게
          재현한다는 뜻은 아닙니다.
        </p>
      </section>

      <footer>
        <b>FlySwarm</b>
        <span>UTILITY SWARM + FULL-CONNECTOME BOSS</span>
        <a href="https://github.com/dh1180/FlySwarm" target="_blank" rel="noreferrer">SOURCE ↗</a>
      </footer>
    </main>
  );
}
