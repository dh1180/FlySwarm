# Full-Connectome Boss Architecture

## Goal

Use the full browser-ready FlyWire FAFB v783 source graph for one boss while
keeping hundreds of ordinary enemies cheap enough for a real-time web game.

## Why only the boss?

The ordinary enemies use Utility AI and local steering. Replicating a
138,639-neuron spiking state for every ordinary fly would multiply memory and
simulation cost by the number of enemies. One dedicated boss lets the
connectome simulation remain meaningful while the surrounding swarm stays
interactive.

## Source graph

FlySwarm currently loads the Full profile published by
`RaphaelSR/fly-brain-bench` at pinned commit:

`825122b532a2196f144c78c4b92c4c1371bc57c4`

Expected metadata:

| Field | Value |
|---|---:|
| neuron slots | 138,639 |
| directed pairs | 15,091,983 |
| aggregated synapses | 54,492,922 |
| minimum source pair weight | 1 |
| pair pruning | none in source graph |
| synapse count clipping | none |

The worker validates the metadata and SHA-256 hashes before accepting the
graph. A failed Full load is treated as an error rather than silently falling
back to a smaller network.

## Sensory interface

The game does not have a literal compound eye. Instead it turns boss-relative
player direction and imminent projectile threat into left/right looming drive.

Those rates stimulate FlyWire LPLC2 populations selected from the real cell
type metadata.

This is an engineered sensory transducer around a measured wiring diagram.

## Neural dynamics

Every represented neuron receives a LIF state. Connectivity is stored as a
CSR graph and only active neurons are integrated, which keeps the whole graph
tractable in a browser Worker.

The graph weights remain fixed.

## Motor interface

Population spike readouts are converted to body control:

| Neural population | Game actuator |
|---|---|
| DNa02 left/right | steering |
| DNa01, DNb01, DNg13 | forward drive |
| MDN | backward drive |
| DNp01 | escape drive |
| DNp09 | stopping |
| DNp18 / DNp01 | wing / high-activity drive |

The game body, HP system and pulse attack remain game mechanics rather than
claims about literal biological motor execution.

## Threading

```text
Canvas / game loop
      |
      | sensory scalar input
      v
Web Worker
  - gzip decode
  - CSR graph
  - 138,639 LIF states
  - full graph propagation
      |
      | motor population outputs
      v
Boss body mapping
```

This prevents graph loading and spiking updates from blocking the main Canvas
frame loop.
