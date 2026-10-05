const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

let rngState = 42 >>> 0;
const random = () => {
  rngState = (1664525 * rngState + 1013904223) >>> 0;
  return rngState / 4294967296;
};

const gaussian = () => {
  const u = Math.max(Number.EPSILON, random());
  const v = Math.max(Number.EPSILON, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const betaLikeThreat = () => Math.min(1, Math.pow(random(), 1.8));

const baseWeights = [
  [1.15, 0, 0, 0, 0, 0, 0, 0],
  [0, 0.9, -0.78, 0.82, -0.72, 0.34, 0.08, 0],
];

const learned = Array.from({ length: 2 }, () => Array(8).fill(0));
let baseline = 0;
let learningRate = 0.0015;
let sigma = 0.1;

const sampleState = () => {
  const side = random() * 2 - 1;
  const distance = random();
  const bulletThreat = betaLikeThreat();
  const proximity = 1 - distance;
  const threat = clamp(
    0.08 + proximity * 0.62 + bulletThreat * 0.78,
    0,
    1,
  );

  const turn = clamp(
    side * (0.45 + 0.55 * threat) + gaussian() * 0.07,
    -1,
    1,
  );
  const forward = clamp(
    (0.35 + 0.55 * distance) *
      (1 - 0.55 * bulletThreat) *
      (0.75 + 0.25 * (1 - Math.abs(side))) +
      gaussian() * 0.05,
    0,
    1,
  );
  const backward = clamp(
    0.55 * bulletThreat +
      0.35 * proximity * (1 - Math.abs(side)) +
      gaussian() * 0.04,
    0,
    1,
  );
  const escape = clamp(
    0.7 * bulletThreat + 0.25 * proximity + gaussian() * 0.05,
    0,
    1,
  );
  const stop = clamp(
    0.15 * proximity +
      0.45 * bulletThreat * (1 - proximity) +
      gaussian() * 0.03,
    0,
    1,
  );
  const wing = clamp(
    0.25 + 0.45 * threat + 0.15 * distance + gaussian() * 0.05,
    0,
    1,
  );
  const activity = clamp(
    (forward + backward + escape + wing) / 4 + gaussian() * 0.03,
    0,
    1,
  );

  const features = [
    turn,
    forward,
    backward,
    escape,
    stop,
    wing,
    activity,
    1,
  ];

  const targetTurn = clamp(side * (1 - 1.35 * bulletThreat), -1, 1);
  const targetDrive = clamp(
    1.1 * distance -
      1.15 * bulletThreat -
      0.6 * Math.max(0, 0.2 - distance),
    -1,
    1,
  );

  return { features, target: [targetTurn, targetDrive] };
};

for (let step = 0; step < 120000; step += 1) {
  const { features, target } = sampleState();
  const mean = [0, 0];

  for (let output = 0; output < 2; output += 1) {
    for (let input = 0; input < 8; input += 1) {
      mean[output] +=
        (baseWeights[output][input] + learned[output][input]) *
        features[input];
    }
  }

  const noise = [gaussian() * sigma, gaussian() * sigma];
  const action = [
    clamp(mean[0] + noise[0], -1, 1),
    clamp(mean[1] + noise[1], -1, 1),
  ];

  const turnError = (action[0] - target[0]) ** 2;
  const driveError = (action[1] - target[1]) ** 2;
  const reward = 1 - 1.5 * turnError - 1.2 * driveError;
  const advantage = reward - baseline;
  baseline = baseline * 0.995 + reward * 0.005;

  for (let output = 0; output < 2; output += 1) {
    const score = noise[output] / Math.max(0.0001, sigma * sigma);
    for (let input = 0; input < 8; input += 1) {
      learned[output][input] = clamp(
        learned[output][input] +
          learningRate * advantage * score * features[input],
        -1.6,
        1.6,
      );
    }
  }

  if (step === 30000 || step === 60000 || step === 90000) {
    learningRate *= 0.7;
    sigma = Math.max(0.04, sigma * 0.8);
  }
}

const evaluate = (delta, samples = 50000) => {
  let reward = 0;
  let turnMse = 0;
  let driveMse = 0;

  for (let sample = 0; sample < samples; sample += 1) {
    const { features, target } = sampleState();
    const action = [0, 0];

    for (let output = 0; output < 2; output += 1) {
      for (let input = 0; input < 8; input += 1) {
        action[output] +=
          (baseWeights[output][input] + delta[output][input]) *
          features[input];
      }
      action[output] = clamp(action[output], -1, 1);
    }

    const turnError = (action[0] - target[0]) ** 2;
    const driveError = (action[1] - target[1]) ** 2;
    reward += 1 - 1.5 * turnError - 1.2 * driveError;
    turnMse += turnError;
    driveMse += driveError;
  }

  return {
    reward: reward / samples,
    turnMse: turnMse / samples,
    driveMse: driveMse / samples,
  };
};

const zero = [Array(8).fill(0), Array(8).fill(0)];
const result = {
  curriculum: 'connectome-readout-surrogate-v1',
  episodes: 120000,
  seed: 42,
  seedPolicy: evaluate(zero),
  trainedPolicy: evaluate(learned),
  learned,
};

console.log(JSON.stringify(result, null, 2));
