export const PRETRAINED_DOPAMINE_POLICY = {
  version: 1,
  curriculum: 'connectome-readout-surrogate-v1',
  episodes: 120000,
  seed: 42,
  seedReward: 0.2934,
  trainedReward: 0.8518,
  turnMse: 0.079,
  driveMse: 0.0248,
  learned: [
    [-0.592, 0.0262, 0.0043, -0.0641, -0.0624, -0.0143, -0.0307, -0.0005],
    [-0.0348, 0.9492, -0.0708, -0.9922, 0.8407, -0.3223, -0.0868, -0.3266],
  ],
} as const;
