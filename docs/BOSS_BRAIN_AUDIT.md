# Full-Connectome Boss Audit

This document records the code-path audit performed after the first Full-Connectome Boss implementation.

## Conclusion

The boss is controlled by outputs produced by the full FlyWire-derived spiking graph, but the first implementation still contained two game-side shortcuts that weakened that claim:

1. sensory left/right was calculated from world-space X instead of the boss's own heading;
2. boss movement had a constant forward term and an explicit away-from-player escape vector.

Both were removed in this revision.

The remaining non-neural behavior is limited to physical/game constraints such as world-boundary collision, HP, hitboxes and attack effects.

## Verified signal path

```text
Player / projectile state
        ↓
Boss-relative visual side + threat
        ↓
LPLC2 left / right populations
        ↓
Full FlyWire-derived CSR graph
138,639 neuron slots
15,091,983 directed pairs
        ↓
LIF spike propagation
        ↓
Descending / motor populations
        ↓
TURN / FORWARD / BACKWARD / ESCAPE / STOP / WING
        ↓
Boss heading and velocity
```

## 1. Connectome package integrity

The Worker verifies:

- FlyWire version metadata
- 138,639 runtime neuron slots
- 15,091,983 directed pairs
- 54,492,922 aggregated synapses
- threshold = 1
- no weight cap
- connection SHA-256
- sign SHA-256

A smaller graph is not substituted on failure.

## 2. CSR decoder

The packed connection decoder was compared with the pinned upstream `fly-brain-bench` decoder.

Verified behavior:

- per-source edge counts build `indptr`
- destination indices are row-delta decoded
- pair magnitudes are read without source-pair pruning
- presynaptic sign bits are MSB-first
- signed weights use the same 0.275 scale

## 3. LIF dynamics

The Worker uses the same main constants as the pinned upstream LIF implementation:

- resting potential: -52 mV
- reset potential: -52 mV
- threshold: -45 mV
- membrane time constant: 20 ms
- synaptic time constant: 5 ms
- refractory period: 2.2 ms
- synaptic delay: 1.8 ms
- synaptic weight scale: 0.275
- Poisson drive constants: 150 / 250

This revision also restores the upstream distinction between stimulated and non-stimulated neurons:

- stimulated neurons are not placed into the normal refractory state after firing;
- stimulated neurons remain active until stimulation is removed.

## 4. Sensory input

The previous implementation used the player's world-space X displacement to choose left/right input.

That was incorrect for a moving boss because the fly's left/right eye should be relative to its own heading.

This revision computes the player direction in boss-local coordinates:

- negative side -> left LPLC2 drive
- positive side -> right LPLC2 drive
- straight-ahead threat drives both eyes

Projectile proximity also contributes to looming strength.

## 5. Glance timing

The first version used a short 50 ms response without a proper baseline.

This revision follows the pinned upstream glance structure more closely:

1. 90 ms settling / baseline window
2. 30 ms LPLC2 loom pulse
3. 60 ms post-pulse read tail
4. 90 ms response window compared against the preceding baseline

Motor output is calculated from baseline-subtracted evoked firing rather than raw cumulative spike counts.

## 6. Motor channels

The Worker now refuses to enable the boss if required populations are missing.

Required channels:

| Readout | Population |
|---|---|
| Turn | DNa02 left / right |
| Forward | DNa01, DNb01, DNg13 |
| Backward | MDN |
| Escape | DNp01 |
| Stop | DNp09 |
| Wing drive | DNp18 / DNp01 |

The exact population indices come from the pinned source `channels.json`.

## 7. Game-body mapping

This part is intentionally engineered rather than claimed as literal fly biomechanics.

The first implementation included:

- a constant forward drive;
- an explicit vector pushing the boss away from the player during escape.

Those have been removed.

Current movement is driven by:

- DNa02 imbalance -> heading change
- walk / wing / escape output -> forward drive
- backward output -> reverse drive
- stop output -> braking

World-border reflection is still a physical game constraint.

## 8. Remaining limitations

The implementation uses the whole source connectivity graph, but this is not a complete biological fruit-fly simulation.

Not modeled completely:

- receptor-specific dynamics
- neuromodulation
- exact compartmental morphology
- muscle/body biomechanics
- real compound-eye image transduction
- internal physiological state

The scientifically accurate project description remains:

> A game boss controlled by a whole-connectome-derived spiking simulation.

not:

> A complete digital fruit fly.
