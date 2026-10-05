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
          <em>AI SWARM SURVIVAL</em>
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
        <div className="hero-kicker">MULTI-AGENT SURVIVAL EXPERIMENT // BUILD 001</div>
        <div className="hero-layout">
          <div>
            <h1>
              10,000 FLIES.<br/>
              <span>ONE HUMAN.</span>
            </h1>
            <p>
              똑같이 달려드는 몬스터는 없습니다. 각 초파리는 서로 다른 성향을 가진
              작은 AI 에이전트이며 주변 개체, 투사체, 플레이어를 보고 스스로 행동을 선택합니다.
            </p>
          </div>
          <div className="hero-stat">
            <small>OBJECTIVE</small>
            <strong>SURVIVE.</strong>
            <i>WASD · AUTO FIRE · EVOLVING SWARM</i>
          </div>
        </div>
      </header>

      <section className="experiment" id="experiment">
        <div className="section-heading">
          <span>01 / LIVE EXPERIMENT</span>
          <h2>THE SWARM<br/>IS LEARNING.</h2>
          <p>
            웨이브가 끝날 때 살아남은 초파리의 성향이 다음 세대의 기준값에 반영됩니다.
            오래 버틸수록 더 빠르고, 더 사회적이고, 더 까다로운 군집이 만들어집니다.
          </p>
        </div>
        <FlySwarmGame />
      </section>

      <section className="brain-section" id="brain">
        <div className="section-heading dark-heading">
          <span>02 / BRAIN MODEL</span>
          <h2>EVERY FLY<br/>HAS A BRAIN.</h2>
          <p>
            현재 버전은 실제 초파리 뇌 전체를 시뮬레이션하는 모델이 아니라,
            초파리 군집 행동을 게임 시스템으로 표현한 독립형 Utility AI입니다.
          </p>
        </div>

        <div className="brain-grid">
          <BrainBlock
            number="01"
            title="PERCEPTION"
            body="플레이어 거리, 주변 초파리 밀도, 가까운 투사체, 현재 체력을 개체별 입력으로 사용합니다."
          />
          <BrainBlock
            number="02"
            title="UTILITY AI"
            body="CHASE, FLEE, SWARM의 점수를 매 프레임 계산하고 가장 높은 행동을 선택합니다."
          />
          <BrainBlock
            number="03"
            title="PERSONALITY"
            body="aggression, fear, social, smell, speed 값이 개체마다 변이되어 같은 상황에서도 서로 다르게 반응합니다."
          />
          <BrainBlock
            number="04"
            title="SWARM STEERING"
            body="가까운 개체만 Spatial Hash로 조회해 cohesion과 separation을 계산하고 군집 이동을 만듭니다."
          />
          <BrainBlock
            number="05"
            title="EVOLUTION"
            body="웨이브 전환 시 생존 개체의 평균 성향을 다음 세대 기준값에 섞어 군집의 특성을 점진적으로 변화시킵니다."
          />
          <BrainBlock
            number="06"
            title="NEXT"
            body="향후 실제 FlyWire connectome에서 추출한 소규모 회로 구조와 Web Worker 기반 대규모 시뮬레이션을 연결할 수 있습니다."
          />
        </div>
      </section>

      <section className="warning-section">
        <span>SCIENTIFIC NOTE</span>
        <p>
          FlySwarm의 적 AI는 <b>실제 초파리의 신경계를 재현한 생물학적 시뮬레이션이 아닙니다.</b>
          현재는 초파리의 군집성과 행동 선택에서 영감을 받은 게임용 인공 에이전트입니다.
        </p>
      </section>

      <footer>
        <b>FlySwarm</b>
        <span>HUMAN VS ARTIFICIAL FRUIT-FLY SWARM</span>
        <a href="https://github.com/dh1180/FlySwarm" target="_blank" rel="noreferrer">SOURCE ↗</a>
      </footer>
    </main>
  );
}
