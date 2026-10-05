# FlySwarm 🪰

> **Utility swarm. Full-connectome boss. Survive.**

FlySwarm은 뱀서류 생존 게임에 두 종류의 적 AI를 결합한 브라우저 게임 프로젝트입니다.

- 일반 초파리 수백 마리: 가벼운 **Utility AI + Steering Behavior**
- 보스: FlyWire FAFB v783에서 파생된 **전체 source connectome + leaky integrate-and-fire(LIF) dynamics**

## 🎮 현재 구현

- WASD / 방향키 이동
- 가장 가까운 적 자동 공격
- 경험치 Orb / 레벨업
- 17종 레벨업 Mutation
- 웨이브 증가 및 군집 진화
- 초파리 개체별 personality genome
- Spatial Hash 기반 근접 탐색
- 전체화면 모드
- 3웨이브부터 Full-Connectome Boss
- 보스 neural output 실시간 HUD
- 일반 초파리 Agent Inspector
- Game Over / Restart

## 🧠 일반 초파리 AI

일반몹은 브라우저에서 수백 마리를 동시에 처리하기 위해 가벼운 Utility AI를 사용합니다.

입력:

- 플레이어 거리
- 주변 초파리 밀도
- 가까운 투사체
- 현재 HP
- aggression / fear / social / smell / speed genome

행동:

- `CHASE`
- `FLEE`
- `SWARM`
- `WANDER`

주변 개체 탐색에는 Spatial Hash를 사용하므로 모든 개체 쌍을 비교하지 않습니다.

## 🧬 Full-Connectome Boss

보스는 일반몹의 Utility AI를 사용하지 않습니다.

게임 시작 시 별도 Web Worker가 전체 connectome package를 백그라운드에서 불러옵니다.

사용하는 Full source profile:

- **138,639 neuron slots**
- **15,091,983 directed neuron pairs**
- **54,492,922 aggregated synapses**
- threshold = 1
- connection pair pruning 없음
- synapse count clipping 없음

이 패키지는 FlyWire FAFB v783 데이터를 기반으로 만들어진 공개 브라우저용 source-complete graph입니다.

> FlyWire 원 논문은 FAFB v783 전체에 **139,255 proofread neurons**와 **54.5 million synapses**를 보고합니다.  
> FlySwarm이 사용하는 simulation source graph의 index space는 연결 모델 입력에 포함된 138,639개 뉴런입니다. 따라서 “Full”은 **이 source graph의 모든 pair를 사용한다는 의미**이며, 생물학적 뇌의 모든 세포 상태·수용체·신경조절·몸체를 완전하게 재현한다는 뜻은 아닙니다.

### Boss signal path

```text
Player position / threat
        │
        ▼
Synthetic visual loom
        │
        ▼
Left / Right LPLC2 population
        │
        ▼
138,639-neuron LIF simulation
15,091,983 directed pairs
        │
        ▼
Descending / motor channels
        │
        ├─ DNa02 → turn
        ├─ DNa01 / DNb01 / DNg13 → forward
        ├─ MDN → backward
        ├─ DNp01 → escape
        ├─ DNp09 → stop
        └─ DNp18 / DNp01 → wing drive
        │
        ▼
Boss body controller
```

신경 연결 가중치는 게임 중 학습시키거나 변경하지 않습니다. 게임은 고정 connectome 위에서 LIF state를 진행하고, sensory input과 motor readout을 게임 세계에 연결합니다.

## ⚡ Whole-brain runtime

30MB급 전체 연결 graph를 메인 Canvas thread에서 돌리면 게임 프레임이 끊길 수 있으므로 Full-Connectome Boss는 별도 Web Worker에서 실행합니다.

게임 엔진과 whole-brain simulation 사이에는 작은 입력/출력 값만 전달합니다.

```text
Main Game Thread
  └─ player / bullets / physics / swarm
              │
              │ side + threat
              ▼
Connectome Web Worker
  └─ Full graph + LIF
              │
              │ neural readouts
              ▼
Main Game Thread
  └─ boss movement / escape / pulse
```

전체 connectome package는 게임 시작 뒤 lazy background load되며, integrity metadata와 SHA-256을 검사합니다. 정상 데이터가 없으면 더 작은 graph로 조용히 대체하지 않습니다.

## 🧪 LIF approximation

현재 neuron dynamics는 Shiu et al. 계열의 단순화된 leaky integrate-and-fire parameterization을 사용합니다.

이것은 실제 초파리의 의식, 기억, 전체 생리 상태를 복제하는 모델이 아닙니다. 특히 다음 항목은 공학적으로 만든 인터페이스입니다.

- 게임 화면 → LPLC2 sensory drive
- shared LIF parameters
- descending-neuron population → 2D game movement mapping
- boss hitbox / HP / 공격 효과

따라서 정확한 표현은:

> **“A game boss controlled by a whole-connectome-derived spiking simulation.”**

이지,

> “실제 초파리의 정신을 업로드했다”

가 아닙니다.

## ⬆️ Mutations

현재 레벨업 선택지:

- Heavy Shot — damage
- Synapse Rush — fire rate
- Split Signal — multishot
- Motor Cortex — movement speed
- Thick Skin — max HP / heal
- Axon Piercer — piercing
- Dopamine Field — XP magnet
- Fast Conduction — bullet speed
- Giant Vesicle — bullet size
- Burst Firing — critical chance
- Homeostasis — HP regeneration
- Chitin Layer — damage reduction
- Motor Shock — knockback
- Satellite Neuron — orbiting weapon
- Action Potential Nova — periodic area damage
- Memory Consolidation — XP gain
- Connectome Breaker — boss damage

## 🛠 Stack

- React
- TypeScript
- Vite
- HTML Canvas
- Web Worker
- Leaky Integrate-and-Fire simulation
- Utility AI
- Steering Behavior
- Spatial Hash

## 🚀 Run

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

> Full-Connectome Boss는 실행 중 약 30.7MB의 공개 graph package를 외부 source에서 불러옵니다. 네트워크가 차단된 환경에서는 일반 swarm 게임은 실행되지만 whole-brain boss는 로드되지 않습니다.

## 📚 Data / model provenance

FlyWire:

- Dorkenwald et al. **Neuronal wiring diagram of an adult brain.** Nature 634, 124–138 (2024).
- Schlegel et al. **Whole-brain annotation and multi-connectome cell typing of Drosophila.** Nature 634, 139–152 (2024).

Whole-brain web package / browser implementation reference:

- RaphaelSR/fly-brain-bench
- pinned source commit: `825122b532a2196f144c78c4b92c4c1371bc57c4`

See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) and [docs/CONNECTOME_BOSS.md](./docs/CONNECTOME_BOSS.md).
