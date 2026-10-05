export const PRETRAINED_DOPAMINE_POLICY = {
  version: 1,
  curriculum: 'connectome-readout-surrogate-v1',
  episodes: 120000,
  seed: 42,
  seedReward: 0.537,
  trainedReward: 0.909,
  turnMse: 0.0432,
  driveMse: 0.0221,
  learned: [
    [-0.3506, -0.0219, 0.0187, 0.0421, 0.0191, 0.0085, 0.0254, 0.0057],
    [-0.0657, 0.869, -0.0828, -1.0035, 0.3676, -0.4847, -0.1431, -0.231],
  ],
} as const;
