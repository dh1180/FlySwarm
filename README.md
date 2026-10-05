# FlySwarm 🪰

> **10,000 flies. One human. Survive the swarm.**

FlySwarm은 뱀서류(Vampire Survivors-like) 생존 게임 구조에 **다중 에이전트 군집 AI**를 결합한 브라우저 게임 프로젝트입니다.

각 초파리는 단순히 플레이어를 직선 추적하지 않습니다. 개체마다 서로 다른 `aggression`, `fear`, `social`, `smell`, `speed` 성향을 가지고 주변 상황을 평가해 행동을 선택합니다.

## 🎮 현재 구현

- WASD / 방향키 이동
- 가장 가까운 적을 향한 자동 공격
- 경험치 오브 및 레벨업
- 3개 선택지 방식의 업그레이드
- 웨이브 증가 및 적 수 / 체력 / 속도 스케일링
- 게임 오버 및 재시작
- 개별 초파리 클릭 후 AI 성향 확인

## 🧠 Fly AI

각 초파리는 매 프레임 아래 입력을 사용합니다.

- 플레이어와의 거리
- 주변 초파리 밀도
- 가까운 투사체
- 현재 HP
- 개체별 personality genome

행동 후보:

- `CHASE`: 플레이어 추적
- `FLEE`: 투사체 및 위협 회피
- `SWARM`: 주변 개체와 cohesion / separation 기반 군집 이동
- `WANDER`: 초기 / 기본 상태

현재 버전은 **Utility AI + Steering Behavior** 기반입니다.

## 🧬 Swarm Evolution

한 웨이브는 28초입니다.

웨이브 전환 시 현재 생존해 있는 개체들의 평균 성향을 구하고 기존 Swarm Genome과 혼합합니다. 이후 생성되는 다음 세대 초파리는 변경된 평균값을 중심으로 다시 변이됩니다.

즉, 플레이 시간이 길어질수록 군집의 평균 특성이 조금씩 변화합니다.

## ⚡ Performance

모든 초파리 쌍을 비교하면 개체 수가 증가할수록 연산량이 급격히 늘어납니다.

FlySwarm은 `SpatialHash`를 사용하여 각 개체 주변의 제한된 셀만 조회합니다.

```
naive neighbor search
O(N²)

FlySwarm
Spatial Hash → local neighborhood query
```

현재 동시 초파리 수는 최대 약 360마리로 제한되어 있습니다.

## 🛠 Stack

- React
- TypeScript
- Vite
- HTML Canvas
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

## 🔬 Scientific Note

FlySwarm은 실제 초파리의 전체 신경계를 재현한 생물학적 시뮬레이션이 아닙니다.

현재 `FLY` 에이전트는 초파리의 군집성 및 행동 선택에서 아이디어를 얻은 **게임용 인공 에이전트**입니다.

향후 확장 아이디어:

- FlyWire connectome 데이터에서 일부 회로 구조 추출
- 작은 neural controller 실험
- Web Worker 기반 수천 개 에이전트 병렬 업데이트
- 실제 행동 데이터 기반 파라미터 보정
- 군집 유전 알고리즘 고도화
- 보스형 Hive Mind / Queen Fly
