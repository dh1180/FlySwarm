<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&height=220&color=0:071018,48:0D1F28,100:1C2A17&text=FlySwarm&fontColor=C7FF45&fontSize=54&fontAlignY=42&animation=fadeIn&desc=Whole-connectome%20survival%20game&descColor=E8F7FF&descSize=16&descAlignY=64" width="100%" />

### 🪰 Utility Swarm × FlyWire Whole-Connectome Boss × Synaptic Fusion

**수백 마리의 Utility AI 초파리와, 실제 초파리 커넥톰에서 유래한 spiking simulation 보스를 상대하는 브라우저 생존 게임입니다.**

<p>
  <img src="https://img.shields.io/badge/React-19.3-61DAFB?style=flat-square&logo=react&logoColor=111111" />
  <img src="https://img.shields.io/badge/TypeScript-7.0-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-8.3-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Canvas-2D-0D1117?style=flat-square&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/Web%20Worker-Whole%20Brain-5BEAFF?style=flat-square" />
  <img src="https://img.shields.io/badge/Web%20Audio-Procedural-C77DFF?style=flat-square" />
  <img src="https://github.com/dh1180/FlySwarm/actions/workflows/ci.yml/badge.svg" />
</p>

</div>

---

## 🚀 프로젝트 개요

**FlySwarm**은 뱀서류 생존 게임의 대규모 군집 전투와 초파리 connectome 기반 신경 시뮬레이션을 결합한 실험적 브라우저 게임입니다.

일반 적은 수백 개체를 동시에 처리하기 위해 **Utility AI + Steering Behavior + Spatial Hash**를 사용하고, 보스는 별도 Web Worker에서 실행되는 **FlyWire FAFB v783-derived whole-connectome LIF simulation**의 운동 출력을 실제 이동에 연결합니다.

최종적으로 5단계 Core Boss를 모두 처치하면 일반몹이 전부 사라지고, **whole-connectome + pretrained motor policy + Mushroom Body-inspired plastic memory**를 가진 VIRTUAL DROSOPHILA와 1:1 최종전을 진행합니다.

> **Scientific scope**  
> FlySwarm은 실제 초파리의 의식이나 인지 전체를 복제한 프로젝트가 아닙니다.  
> 정확한 표현은 **“a game boss controlled by a whole-connectome-derived spiking simulation”**이며, 최종 보스의 Mushroom Body 계층은 생물학적으로 영감을 받은 game-side plasticity model입니다.

---

## 📌 At a Glance

| 항목 | 현재 구현 |
| --- | ---: |
| Whole-connectome neuron slots | **138,639** |
| Directed neuron pairs | **15,091,983** |
| Aggregated synapses | **54,492,922** |
| Pretrained motor policy | **120,000 steps** |
| Core Boss | **5종** |
| Final Boss | **1종 · Virtual Drosophila** |
| 기본 Mutation | **30종** |
| Synaptic Fusion | **15종** |
| 일반 적 Archetype | **5종** |
| Reward Cache | **COMMON / RARE / MYTHIC** |

---

## 🎮 핵심 게임플레이

- WASD / 방향키 이동
- 가장 가까운 적 자동 공격
- 경험치 Orb와 레벨업
- Magnet 반경 진입 시 XP Orb 즉시 획득
- 30종 Mutation과 최대 레벨 성장
- 공격 스킬 6종의 모든 2개 조합을 구현한 **15종 Synaptic Fusion**
- Reward Cache 기반 추가 성장
- 웨이브 증가와 군집 Genome 진화
- 적 체력 수치 표시
- Fullscreen / 모바일 가상 조이스틱
- 일반 초파리 Agent Inspector
- Boss neural output / dopamine / Mushroom Body telemetry HUD
- Game Over / Restart / Final Clear

### 🎯 전투 진행

~~~text
Normal Swarm
    ↓
WAVE 3  · NEURAL HUNTER
    ↓
WAVE 5  · STORM BRAIN
    ↓
WAVE 7  · SWARM QUEEN
    ↓
WAVE 9  · GLIAL TITAN
    ↓
WAVE 11 · CONNECTOME APEX
    ↓
ARENA PURGE
    ↓
VIRTUAL DROSOPHILA
    ↓
GAME CLEAR
~~~

---

## 🧠 Boss Brain Architecture

보스는 일반 초파리의 Utility AI를 사용하지 않습니다.

게임 시작 후 별도 **Web Worker**가 whole-connectome package를 로드하고, integrity metadata와 SHA-256을 검증한 뒤 전체 연결 graph의 LIF state를 진행합니다.

~~~mermaid
flowchart LR
    GAME[Game State<br/>Player / Projectile Threat]
    SENSOR[LPLC2-like Sensory Drive]
    BRAIN[Whole-Connectome LIF<br/>138,639 neuron slots]
    MOTOR[Descending / Motor Readout]
    POLICY[DopaminePolicy<br/>120K-step pretrained]
    BODY[Boss Body Controller]

    GAME --> SENSOR
    SENSOR --> BRAIN
    BRAIN --> MOTOR
    MOTOR --> POLICY
    POLICY --> BODY
    BODY --> GAME
~~~

### Signal path

| Neural population | 게임에서 사용하는 의미 |
| --- | --- |
| DNa02 | 좌 / 우 회전 |
| DNa01, DNb01, DNg13 | 전진 |
| MDN | 후진 |
| DNp01 | Escape |
| DNp09 | Stop |
| DNp18, DNp01 | Wing / activity drive |

게임은 connectome의 synaptic weight를 임의로 바꾸지 않습니다.  
학습은 **connectome output → game movement**를 변환하는 별도 policy와 최종 보스의 Mushroom Body-inspired memory layer에서 수행합니다.

---

## 🧬 Whole-Connectome Runtime

현재 source profile:

- **138,639 neuron slots**
- **15,091,983 directed neuron pairs**
- **54,492,922 aggregated synapses**
- pair pruning 없음
- synapse count clipping 없음
- threshold 기반 source graph 전체 사용

30MB급 연결 graph를 메인 Canvas thread에서 직접 돌리면 프레임이 끊길 수 있기 때문에 신경 시뮬레이션은 Web Worker에서 실행합니다.

~~~text
Main Game Thread
  ├─ player / swarm / bullets / skills / physics
  │
  └── side + threat
          ↓
Connectome Web Worker
  ├─ full graph
  ├─ LIF dynamics
  └─ motor readout
          ↓
Main Game Thread
  └─ boss turn / drive / escape / pulse
~~~

### LIF approximation

현재 구현은 단순화된 leaky integrate-and-fire dynamics를 사용합니다.

| Parameter | Value |
| --- | ---: |
| Rest | -52 mV |
| Reset | -52 mV |
| Threshold | -45 mV |
| Membrane τ | 20 ms |
| Synaptic τ | 5 ms |
| Refractory | 2.2 ms |
| Delay | 1.8 ms |
| Base weight | 0.275 |

---

## 🧪 Dopamine-style Boss Learning

Connectome graph 자체는 고정하고, connectome에서 나온 neural output을 실제 게임 행동으로 바꾸는 policy에 reward-modulated learning을 적용합니다.

- **120,000-step surrogate curriculum** checkpoint에서 시작
- deterministic seed 42 기준 surrogate reward 0.2934 → 0.8518
- 플레이어에게 피해를 주면 positive reward
- 보스가 피격되면 negative reward
- 탄환 회피 성공 시 small positive reward
- 보스 사망 시 strong negative reward
- eligibility trace를 이용해 최근 행동과 reward 연결
- 작은 exploration 유지
- policy weight / reward / generation을 localStorage에 저장

> 사전학습 metric은 실제 Full-Connectome boss 실전 승률이 아니라, connectome motor readout 형태를 흉내 낸 **surrogate curriculum**의 지표입니다.

사전학습 재현:

~~~bash
npm run train:boss
~~~

---

## 🪰 일반 초파리 AI

일반몹은 수백 개체를 동시에 처리하기 위해 가벼운 Utility AI를 사용합니다.

### Input

- 플레이어 거리
- 주변 초파리 밀도
- 가까운 투사체
- 현재 HP
- aggression / fear / social / smell / speed genome

### Decision

- CHASE
- FLEE
- SWARM
- WANDER

### Archetype

| Type | 특징 |
| --- | --- |
| DRONE | 기본 군집형 |
| DARTER | 빠른 돌진형 |
| BRUTE | 느리지만 높은 체력과 접촉 피해 |
| SPITTER | 거리를 유지하는 원거리형 |
| BOMBER | 플레이어에게 접근해 자폭 |

주변 개체 탐색은 **Spatial Hash**를 사용해 모든 개체 쌍을 직접 비교하지 않습니다.

---

## 👾 Boss Progression

| Stage | Boss | 특징 |
| --- | --- | --- |
| 1 | NEURAL HUNTER | 빠른 이동 + 집중 3연발 |
| 2 | STORM BRAIN | 광범위 neural pulse + 방사 탄막 + 지면 방전 |
| 3 | SWARM QUEEN | 높은 체력 + Darter / Spitter 소환 |
| 4 | GLIAL TITAN | 이중 속도 탄막 + 삼중 글리아 방전 |
| 5 | CONNECTOME APEX | 방사 탄막 + 조준탄 + 다중 방전 + 특수몹 소환 |

등장 단계가 높아질수록 HP, 피해량, 이동 scale, 특수기 주기가 누적 강화됩니다.

### Giant Fiber Evasion Reflex

보스는 단순히 가까운 탄을 피하지 않습니다.

- Bullet / Boss 상대 위치
- 상대 속도
- 약 0.9초 이내 최근접 접근 시간
- 예상 최근접 거리
- Boss hitbox + safety margin

을 이용해 실제 충돌 가능성이 높은 투사체만 위협으로 판단하고 좌우 회피 방향을 계산합니다.

같은 방향의 turn이 오래 유지될 때 생기던 원운동은 **angular velocity + damping + anti-orbit attenuation**으로 완화합니다.

---

## 🧠 FINAL — Virtual Drosophila

5단계 Core Boss를 모두 처치하면 게임은 즉시 끝나지 않습니다.

~~~text
CORE BOSSES 5 / 5
        ↓
Arena Purge
        ↓
3.25 s Final Initialization
        ↓
VIRTUAL DROSOPHILA
        ↓
Final 1 vs 1
~~~

Final Encounter 진입 시:

- 모든 일반 Fly 제거
- Enemy Projectile 제거
- Boss Strike 제거
- Reward Cache / XP Orb 제거
- 기존 Player Projectile / Damage Field 제거
- 일반몹 Spawn 영구 중단
- 일반 Wave 진행 동결

### Final Boss

| 항목 | 값 |
| --- | ---: |
| 최소 HP | **50,000** |
| Damage scale | **×2.15** |
| Movement scale | **×1.46** |
| Special cooldown scale | **×0.48** |
| Phase | **3단계** |

~~~text
Phase 1 · HP > 70%
Phase 2 · 35% < HP ≤ 70%
Phase 3 · HP ≤ 35%
~~~

Phase가 내려갈수록 방사 탄막, 조준탄, Neural Strike와 multi-speed wave의 수와 빈도가 증가합니다.

### Mushroom Body-inspired Plastic Memory

최종 보스는 기존 whole-connectome + DopaminePolicy 위에 추가 memory layer를 사용합니다.

~~~mermaid
flowchart TD
    OUT[Whole-brain motor output]
    STATE[Projectile threat / proximity / HP stress]
    KC[96 Kenyon-cell-like sparse units]
    MBON[Appetitive / Aversive MBON-like readout]
    DAN[DAN-like signed reward]
    BIAS[Approach / Avoidance / Vigilance bias]
    ACTION[Movement + Attack Preference]

    OUT --> KC
    STATE --> KC
    KC --> MBON
    DAN --> MBON
    MBON --> BIAS
    BIAS --> ACTION
~~~

- 96개 KC-like unit
- 각 unit은 10개 입력 중 4개 projection 사용
- 상위 12개 unit만 활성화하는 sparse coding
- MBON+ / MBON− valence readout
- signed DAN reward로 active weight 업데이트
- memory state를 localStorage에 저장

MBON+가 우세하면 접근과 조준 공격이 강해지고, MBON−가 우세하면 회피와 광역 압박 비중이 커집니다.

> 이 계층은 실제 FlyWire mushroom body 시냅스 가소성을 그대로 복원한 것이 아니라 **KC / MBON / DAN 구조에서 영감을 받은 별도 game-side model**입니다.

---

## 🧬 Mutation & Synaptic Fusion

기본 Mutation 30종 중 공격 본체는 다음 6종입니다.

- **Synaptic Vesicle Orbit**
- **Action Potential Burst**
- **Neurotoxin Gradient**
- **Axonal Spike**
- **Glial Matrix**
- **Calcium Cascade**

두 공격이 모두 MAX가 되면 가능한 Fusion을 제안합니다.

한 번 Fusion에 사용된 두 원본 공격은 **효과는 계속 유지되지만 다른 Fusion의 재료로 다시 사용할 수 없습니다.**  
따라서 6개 공격 원본으로 한 판에서 만들 수 있는 Fusion은 최대 3개입니다.

<details>
<summary><b>15종 Synaptic Fusion 전체 보기</b></summary>

| Fusion | MAX Requirement |
| --- | --- |
| GANGLION RESONANCE | Orbit + Burst |
| VESICLE SECRETION HALO | Orbit + Toxin |
| AXONAL SATELLITE | Orbit + Spike |
| SYNAPTIC LATTICE | Orbit + Matrix |
| GLIAL ORBITAL CASCADE | Orbit + Calcium |
| DEPOLARIZATION TOXIN BURST | Burst + Toxin |
| SPIKE PROPAGATION | Burst + Spike |
| GANGLION WAVEFRONT | Burst + Matrix |
| CALCIUM WAVE | Burst + Calcium |
| VENOM AXON | Toxin + Spike |
| NEUROGLIAL MATRIX | Toxin + Matrix |
| HEMOLYMPH CASCADE | Toxin + Calcium |
| AXON MESH | Spike + Matrix |
| SYNAPTIC BARRAGE | Spike + Calcium |
| GLIAL CALCIUM STORM | Matrix + Calcium |

엔진은 6개 공격의 모든 2개 조합인 **6C2 = 15개**가 정확히 한 번씩 존재하는지 검사합니다.

</details>

### Synaptic Vesicle Orbit

Orbit은 후반 보스전에서도 주력 공격으로 사용할 수 있도록 강화되어 있습니다.

- Lv1에서 Orbital 2개
- 회전속도 3.05 rad/s
- 5개 이상이면 70px / 96px 이중 궤도
- 넓어진 접촉 판정
- Boss DPS 강화
- Fusion 시 추가 damage multiplier
- Halo / local pulse / cascade 계열 교차 효과

---

## 🎁 Reward Cache

일반몹 처치 시 낮은 확률로 Reward Cache가 드랍됩니다.

| Cache | 내부 확률 | 선택지 | 선택 보상 |
| --- | ---: | ---: | --- |
| COMMON | **91.5%** | 3개 | 선택 Mutation **+1 Level** |
| RARE | **7.5%** | 4개 | RARE / NEURAL 우선 + **+2 Levels** |
| MYTHIC | **1%** | 4개 | Fusion 우선 + RARE / NEURAL 우선 + **+3 Levels** |

필드에서도 등급이 즉시 구분됩니다.

- **COMMON** — Cyan single ring
- **RARE** — Purple double ring + rotating nodes + RARE ×2
- **MYTHIC** — Gold glow + multi ring + rotating nodes + MYTHIC ×3

공격 스킬이 Cache 보상으로 MAX에 도달해 Fusion 조건을 만족하면 즉시 Synaptic Fusion Offer가 이어집니다.

---

## 🔊 Procedural Neural Audio

외부 MP3/WAV asset 없이 **Web Audio API**로 BGM과 전투 효과음을 실시간 합성합니다.

- 저주파 Drone 2 layer
- 16-step neural pulse sequence
- 공격 / 적 처치 / 피격
- Level Up / Mutation / Fusion
- COMMON / RARE / MYTHIC Cache
- Boss Spawn / Strike / Death
- Virtual Drosophila Spawn / Phase Transition
- Game Over / Clear

브라우저 autoplay 정책 때문에 AudioContext는 ENTER THE SWARM 사용자 입력에서 unlock됩니다.

---

## 🛠 기술 스택

### Frontend / Runtime

| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="46" /> | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" width="46" /> | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vitejs/vitejs-original.svg" width="46" /> |
| :---: | :---: | :---: |
| React 19.3 | TypeScript 7.0 | Vite 8.3 |

### Game / Simulation

<p>
  <img src="https://img.shields.io/badge/Canvas%202D-Game%20Rendering-E34F26?style=flat-square&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/Web%20Worker-Whole%20Brain-5BEAFF?style=flat-square" />
  <img src="https://img.shields.io/badge/Web%20Audio-Procedural%20Sound-C77DFF?style=flat-square" />
  <img src="https://img.shields.io/badge/LocalStorage-Learned%20State-C7FF45?style=flat-square&logoColor=111111" />
</p>

### CI

<p>
  <img src="https://img.shields.io/badge/GitHub%20Actions-Node%2022-2088FF?style=flat-square&logo=githubactions&logoColor=white" />
</p>

---

## 🏗 시스템 아키텍처

~~~mermaid
flowchart LR
    USER[Player Input]
    REACT[React UI / HUD]
    ENGINE[GameEngine<br/>Canvas 2D]
    SWARM[Utility AI Swarm]
    WORKER[Connectome Web Worker]
    AUDIO[Web Audio API]
    STORAGE[(LocalStorage)]

    USER --> REACT
    REACT --> ENGINE
    ENGINE --> SWARM
    ENGINE --> WORKER
    WORKER --> ENGINE
    ENGINE --> AUDIO
    ENGINE --> STORAGE
    STORAGE --> ENGINE
~~~

---

## 📁 프로젝트 구조

~~~text
FlySwarm/
├── src/
│   ├── audio/                  # Procedural BGM / SFX
│   ├── components/             # React UI, HUD, SkillIcon
│   └── game/
│       ├── connectome/         # WholeBrainController + Web Worker
│       ├── learning/           # DopaminePolicy + MushroomBodyMemory
│       ├── GameEngine.ts       # Combat / bosses / skills / progression
│       └── types.ts
├── scripts/
│   └── train-dopamine-policy.mjs
├── docs/
│   ├── BOSS_BRAIN_AUDIT.md
│   └── CONNECTOME_BOSS.md
├── THIRD_PARTY_NOTICES.md
├── package.json
└── vite.config.ts
~~~

---

## ⚙️ 로컬 실행

### 1. Clone

~~~bash
git clone https://github.com/dh1180/FlySwarm.git
cd FlySwarm
~~~

### 2. Install

Node.js **22+** 권장.

~~~bash
npm install
~~~

### 3. Development

~~~bash
npm run dev
~~~

### 4. Production Build

~~~bash
npm run build
~~~

### 5. Preview

~~~bash
npm run preview
~~~

### 6. Boss policy training 재현

~~~bash
npm run train:boss
~~~

---

## ✅ CI

GitHub Actions는 main push와 Pull Request에서 다음을 검증합니다.

~~~bash
npm install --no-audit --no-fund
npm run build
~~~

즉 TypeScript build와 Vite production bundle이 모두 성공해야 CI가 통과합니다.

---

## 📚 Connectome Source & Documentation

FlySwarm의 whole-connectome source profile은 공개 FlyWire FAFB v783 기반 데이터에서 파생된 브라우저용 graph를 사용합니다.

- [Boss Brain Audit](./docs/BOSS_BRAIN_AUDIT.md)
- [Connectome Boss Notes](./docs/CONNECTOME_BOSS.md)
- [Third-party Notices](./THIRD_PARTY_NOTICES.md)
- Source package: [RaphaelSR/fly-brain-bench](https://github.com/RaphaelSR/fly-brain-bench)

> FlyWire 원 자료의 전체 생물학적 상태를 재현하는 것이 아니라, 이 프로젝트가 사용하는 source graph의 모든 연결 pair를 runtime에 사용한다는 의미에서 **whole-connectome-derived**라고 표현합니다.

---

## 🔬 Scientific Boundary

FlySwarm에서 실제 데이터 기반인 부분과 게임용으로 설계한 부분을 구분합니다.

| 실제 connectome 기반 | 게임 / 공학적 모델 |
| --- | --- |
| FlyWire FAFB v783-derived connectivity graph | Game screen → sensory drive |
| Whole graph pair / synapse structure | Shared LIF parameterization |
| LPLC2 source population mapping | 2D boss body / HP / attack pattern |
| Descending / motor population readout | DopaminePolicy reward design |
| Full graph spike propagation | KC / MBON / DAN-inspired memory layer |

따라서 FlySwarm은 **“초파리의 정신을 업로드한 게임”**이 아니라,

> **실제 초파리 whole-connectome에서 유래한 spiking network를 게임의 감각-운동 루프에 연결한 실험적 survival game**

입니다.

---

<div align="center">

### 🪰 Survive the swarm. Outsmart the connectome.

<sub>Built with React, Canvas, Web Workers and a lot of synapses.</sub>

<img src="https://capsule-render.vercel.app/api?type=waving&height=110&section=footer&color=0:071018,48:0D1F28,100:1C2A17" width="100%" />

</div>
