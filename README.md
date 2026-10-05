# FlySwarm 🪰

> **Utility swarm. Full-connectome boss. Survive.**

FlySwarm은 뱀서류 생존 게임에 두 종류의 적 AI를 결합한 브라우저 게임 프로젝트입니다.

- 일반 초파리 수백 마리: **5종 전투 아키타입 + Utility AI + Steering Behavior**
- 보스: **3종 phenotype + FlyWire FAFB v783 전체 source connectome + LIF dynamics**

## 🎮 현재 구현

- WASD / 방향키 이동
- 가장 가까운 적 자동 공격
- 경험치 Orb / 레벨업
- XP Orb가 Magnet 반경 안에 들어오면 즉시 획득
- 31종 레벨업 Mutation + 3종 Evolution Skill
- 웨이브 증가 및 군집 진화
- 초파리 개체별 personality genome
- Spatial Hash 기반 근접 탐색
- 전체화면 모드
- 3웨이브부터 Full-Connectome Boss
- 보스 neural output 실시간 HUD
- 일반 초파리 Agent Inspector
- 획득 스킬 종류 / 현재 레벨 / MAX 상태 HUD
- Max Skill 조합 기반 Evolution/Fusion
- 3종 Full-Connectome Boss 전부 처치 시 Game Clear
- Game Over / Restart / Clear

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

잡몹 아키타입:

- `DRONE` — 기본 군집형
- `DARTER` — 빠르고 가벼운 돌진형
- `BRUTE` — 느리지만 체력/접촉 피해가 높은 탱커형
- `SPITTER` — 거리를 유지하며 원거리 탄환 발사
- `BOMBER` — 플레이어에게 달려들어 근접 자폭

주변 개체 탐색에는 Spatial Hash를 사용하므로 모든 개체 쌍을 비교하지 않습니다.

## 🧪 Dopamine-style Boss Learning

보스의 전체 Connectome graph 자체는 고정합니다.

대신 Connectome에서 나온 neural output을 실제 게임 행동으로 변환하는 정책에
보상학습을 적용합니다.

- 120,000-step surrogate curriculum으로 사전학습된 checkpoint에서 시작
- deterministic seed 42 기준 surrogate reward: 0.2934 → 0.8518
- 플레이어에게 피해를 주면 양의 reward
- 보스가 피해를 입으면 음의 reward
- 보스가 쓰러지면 큰 negative reward
- 최근 행동의 eligibility trace를 이용해 reward와 행동을 연결
- 작은 Gaussian exploration을 유지해 새로운 행동을 탐색
- 학습 가중치, reward 통계, generation을 LocalStorage에 저장
- 다음 보스 및 다음 플레이 세션이 이전 학습 결과를 이어서 사용

이 구조는 실제 초파리의 도파민 회로를 그대로 재현한 것이 아니라,
Drosophila에서 dopamine이 reinforcement / associative learning에 관여한다는
아이디어를 게임용 reward-modulated policy에 적용한 것입니다.

사전학습 metric은 실제 Full Connectome boss 실전 승률이 아니라,
Connectome motor readout의 형태를 흉내 낸 surrogate curriculum에서 계산한 값입니다.
실제 게임에서는 Full Connectome neural output을 입력으로 계속 online fine-tuning합니다.

사전학습 재현:

```bash
npm run train:boss
```

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

### Boss archetypes

모든 보스는 동일한 Full Connectome 계열 neural controller와 pretrained dopamine policy를 공유하지만,
몸체 파라미터와 공격 phenotype은 다릅니다.

- **NEURAL HUNTER** — 빠른 이동과 집중 3연발
- **STORM BRAIN** — 넓은 neural pulse와 방사형 탄막
- **SWARM QUEEN** — 높은 체력과 Darter / Spitter 소환

즉 보스별 차이는 별도의 추적 AI를 추가한 것이 아니라,
동일한 connectome-derived locomotion 위에 게임용 공격 phenotype을 분리한 구조입니다.

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
- Spike Burst — critical damage multiplier
- Hemolymph Leech — heal on kill
- Neurotoxin Cloud — passive area damage
- Chain Synapse — chain damage on hit
- Refractory Shield — regenerating shield
- Adrenaline Loop — low-HP move / fire speed
- Long Axon — longer projectile lifetime
- Neural Overclock — damage / fire rate / move speed
- Axonal Spike — 가장 가까운 적에게 주기적으로 자동 발사되는 관통 신경 스파이크
- Glial Matrix — 조준 방향에 주기적 지속 피해 미세환경
- Calcium Cascade — 강한 적 위치에서 주기적 칼슘 신호 폭주
- Recurrent Circuit — 적중 시 추가 투사체 ricochet
- Apoptosis Trigger — 저체력 적 추가 처형 피해

## 🎁 Reward Cache System

몹 처치 시 낮은 확률로 필드에 Reward Cache가 드랍됩니다.

드랍 확률:

| Enemy | Chest Drop |
|---|---:|
| DRONE | 1.4% |
| DARTER | 1.8% |
| BRUTE | 3.5% |
| SPITTER | 2.6% |
| BOMBER | 2.6% |

드랍된 상자의 내부 등급:

| Cache | Chance | Reward |
|---|---:|---|
| COMMON | 91.5% | 기존 레벨업과 유사한 3개 Mutation 선택 |
| RARE | 7.5% | RARE / NEURAL 위주의 강화된 3택 |
| MYTHIC | 1% | 4개 선택지 + Evolution 가능 시 우선 노출 + NEURAL 우선 |

상자는 필드에서 직접 접촉하면 열리며, 일정 시간이 지나면 사라집니다.
MYTHIC 확률은 Chest가 드랍된 뒤 다시 1%이므로 실제 몹 한 마리 기준으로는 매우 낮습니다.

## 🎨 Custom Skill Icon Set

30개 선택 가능한 기본 Mutation과 15개 Synaptic Fusion 모두 FlySwarm 전용 SVG 아이콘을 사용합니다.

- Emoji / 외부 Image Asset 미사용
- React Inline SVG
- 각 스킬에 고유한 바이오 / 회로 / 전기 / 무기 모티프 적용
- Skill별 Accent Color
- Upgrade Card / Acquired Skill HUD에서 동일 Icon 재사용
- Evolution Icon은 두 원본 능력의 시각적 특징을 결합한 별도 디자인

아이콘 구현:

```text
src/components/SkillIcon.tsx
```

## 🧬 Skill Level / Evolution

모든 기본 Mutation에는 최대 레벨이 있으며, Max Level에 도달한 스킬은 일반 레벨업 선택지에서 제거됩니다.

레벨업 카드에는 다음 정보를 표시합니다.

- 현재 레벨 → 다음 레벨
- 최대 레벨
- 다음 레벨에서 정확히 증가하는 수치
- Evolution 후보의 경우 필요한 MAX 스킬 조합

공격 본체는 아래 6종으로 정의합니다.

- Synaptic Vesicle Orbit
- Action Potential Burst
- Neurotoxin Gradient
- Axonal Spike
- Glial Matrix
- Calcium Cascade

두 공격이 모두 MAX가 되는 순간 가능한 합성을 즉시 제안합니다. `NOT NOW`를 누르면 원본 MAX 스킬을 유지한 채 전투로 복귀하며, 합성은 이후 Level Up / Reward Cache에서 다시 등장할 수 있습니다.

6개 공격의 가능한 모든 2개 조합, 즉 **6C2 = 15개**를 전부 구현합니다.

| Fusion | MAX Requirement |
|---|---|
| GANGLION RESONANCE | Synaptic Vesicle Orbit + Action Potential Burst |
| VESICLE SECRETION HALO | Synaptic Vesicle Orbit + Neurotoxin Gradient |
| AXONAL SATELLITE | Synaptic Vesicle Orbit + Axonal Spike |
| SYNAPTIC LATTICE | Synaptic Vesicle Orbit + Glial Matrix |
| GLIAL ORBITAL CASCADE | Synaptic Vesicle Orbit + Calcium Cascade |
| DEPOLARIZATION TOXIN BURST | Action Potential Burst + Neurotoxin Gradient |
| SPIKE PROPAGATION | Action Potential Burst + Axonal Spike |
| GANGLION WAVEFRONT | Action Potential Burst + Glial Matrix |
| CALCIUM WAVE | Action Potential Burst + Calcium Cascade |
| VENOM AXON | Neurotoxin Gradient + Axonal Spike |
| NEUROGLIAL MATRIX | Neurotoxin Gradient + Glial Matrix |
| HEMOLYMPH CASCADE | Neurotoxin Gradient + Calcium Cascade |
| AXON MESH | Axonal Spike + Glial Matrix |
| SYNAPTIC BARRAGE | Axonal Spike + Calcium Cascade |
| GLIAL CALCIUM STORM | Glial Matrix + Calcium Cascade |

Fusion은 단순 이름 변경이 아니라 원본 두 공격을 함께 증폭하고, 조합별 교차 효과를 추가합니다.

## 🏁 Clear / Difficulty

한 판의 최종 목표는 서로 다른 Full-Connectome Boss 세 종류를 모두 처치하는 것입니다.

```text
NEURAL HUNTER
      ↓
STORM BRAIN
      ↓
SWARM QUEEN
      ↓
GAME CLEAR
```

현재 밸런스는 30종 기본 스킬과 15종 Fusion 성장을 고려해 조정했습니다.

- Wave 주기: 28초 → 32초
- 초반 Enemy Cap 및 Spawn 증가량 완화
- 일반 적 HP 증가량 완화
- Spitter / Bomber 피해량 완화
- Boss HP / Contact / Pulse / Projectile Scaling 완화
- BRUTE / SPITTER / BOMBER는 더 많은 XP 지급
- Boss 처치 XP 보상 증가
- 후반 레벨업 XP 요구량 완화

## ✨ Combat VFX / Controls

- Mouse / touch world-space aiming with fullscreen letterbox correction
- Axonal Spike: 획득 후 가장 가까운 적에게 자동 주기 발사
- Glial Matrix: mouse / touch 방향을 참고해 자동 생성
- 모바일: 좌측 가상 조이스틱 이동
- 수동 E / 우클릭 낙뢰 스킬 제거
- 잡몹 종류별 색상 / 크기 / glow 차별화
- 장판 radial VFX
- lightning zig-zag trail
- hit / death particles
- boss spawn / death burst
- screen shake
- player damage flash
- enemy projectile glow

Storm Brain의 보라색 방전은 이제 장식선이 아니라 **0.55초 Target Telegraph → 실제 범위 피해**를 주는 회피형 공격입니다.

경험치 Orb는 Player의 Magnet 반경 안에 들어오는 순간 즉시 획득됩니다.
반경 바깥의 근처 Orb에는 보조 흡인이 적용됩니다.

## 🔊 Procedural Neural Audio

FlySwarm의 음악과 효과음은 외부 MP3/WAV Asset을 사용하지 않고 **Web Audio API로 실행 중 직접 합성**합니다.

### Background Music

- 저주파 Drone 2 Layer
- 16-step Neural Pulse Sequence
- Minor / dissonant 계열의 반복 Pattern
- 짧은 High Synapse Ping
- 브라우저에서 실시간 합성되므로 별도 음원 파일이나 외부 CDN이 필요하지 않습니다.

브라우저의 자동재생 정책 때문에 AudioContext는 페이지 진입 직후가 아니라 **ENTER THE SWARM을 누르는 사용자 입력에서 Unlock**됩니다.

### Sound Effects

다음 이벤트에 개별 Procedural SFX가 연결됩니다.

- 기본 자동 공격
- 일반 적 처치
- Player 피격
- Level Up
- Mutation 획득
- Synaptic Fusion 가능 알림
- Synaptic Fusion 획득
- COMMON / RARE / MYTHIC Reward Cache
- Full-Connectome Boss 등장
- Storm Brain Neural Strike 예고
- Storm Brain Neural Strike 충돌
- Boss 처치
- Axonal Spike
- Calcium Cascade
- Game Over
- Game Clear

고속 자동 공격과 연속 처치음에는 최소 재생 간격을 적용해 Audio Spam을 제한합니다.

### Audio Controls

Game Topbar에서 독립적으로 제어할 수 있습니다.

- `MUSIC ON / OFF`
- `SFX ON / OFF`

Audio Engine:

```text
src/audio/AudioManager.ts
```

## 🛠 Stack

- React
- TypeScript
- Vite
- HTML Canvas
- Web Audio API
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
