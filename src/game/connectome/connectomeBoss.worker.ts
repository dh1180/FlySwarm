/* Full-connectome boss controller.
 *
 * The packed graph layout and LIF constants are compatible with the MIT-licensed
 * fly-brain-bench implementation by Raphael Rocha. The graph itself is derived
 * from FlyWire FAFB v783 and remains subject to the FlyWire data attribution
 * described in THIRD_PARTY_NOTICES.md.
 */

type Meta = {
  version: string;
  threshold: number;
  weight_cap: number | null;
  n_neurons: number;
  n_edges: number;
  synapse_count: number;
  conn_sha256: string;
  sign_sha256: string;
  dicts: {
    cell_type: string[];
    side: string[];
  };
};

type Channels = {
  channels: Record<string, {
    all: number[];
    left?: number[];
    right?: number[];
  }>;
};

const SOURCE_COMMIT = '825122b532a2196f144c78c4b92c4c1371bc57c4';
const BASE = `https://raw.githubusercontent.com/RaphaelSR/fly-brain-bench/${SOURCE_COMMIT}/web`;
const EXPECTED = {
  neurons: 138639,
  pairs: 15091983,
  synapses: 54492922,
  connSha: '2ba8cf910f9ce98a290e84640565158fce924931de74056944691ea0822c437a',
  signSha: '9e80b8675fa38e8a96fdd86a666a9edb7a9c46bba16eb55df237ee92648c0c5a',
};

const P = {
  V0: -52,
  VRST: -52,
  VTH: -45,
  TMBR: 20,
  TAU: 5,
  TRFC: 2.2,
  TDLY: 1.8,
  WSYN: 0.275,
  RPOI: 150,
  FPOI: 250,
};

const post = (message: unknown) => (self as unknown as Worker).postMessage(message);

async function fetchGz(url: string) {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }
  const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function sha256(bytes: Uint8Array) {
  // Copy into a plain ArrayBuffer so TypeScript 7/WebCrypto does not infer
  // SharedArrayBuffer-compatible ArrayBufferLike for the digest input.
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', copy.buffer);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

function varintReader(bytes: Uint8Array) {
  let p = 0;
  return {
    read(out: Int32Array, n: number) {
      let r = 0;
      let s = 0;
      let b = 0;
      for (let i = 0; i < n; i += 1) {
        r = 0;
        s = 0;
        do {
          b = bytes[p++];
          r |= (b & 0x7f) << s;
          s += 7;
        } while (b & 0x80);
        out[i] = r >>> 0;
      }
    },
  };
}

function decodeConnectome(bytes: Uint8Array, n: number, e: number, signBits: Uint8Array) {
  const rd = varintReader(bytes);
  const counts = new Int32Array(n);
  rd.read(counts, n);

  const indptr = new Int32Array(n + 1);
  for (let i = 0; i < n; i += 1) indptr[i + 1] = indptr[i] + counts[i];
  if (indptr[n] !== e) throw new Error(`Connectome edge mismatch: ${indptr[n]} != ${e}`);

  const indices = new Int32Array(e);
  rd.read(indices, e);
  for (let i = 0; i < n; i += 1) {
    const a = indptr[i];
    const b = indptr[i + 1];
    for (let j = a + 1; j < b; j += 1) indices[j] += indices[j - 1];
  }

  const magnitude = new Int32Array(e);
  rd.read(magnitude, e);
  const weights = new Float32Array(e);
  for (let i = 0; i < n; i += 1) {
    const excitatory = (signBits[i >> 3] >> (7 - (i & 7))) & 1;
    const sign = excitatory ? P.WSYN : -P.WSYN;
    for (let j = indptr[i]; j < indptr[i + 1]; j += 1) {
      weights[j] = magnitude[j] * sign;
    }
  }

  return { indptr, indices, weights };
}

function decodeLabels(bytes: Uint8Array, n: number) {
  const values = new Uint16Array(bytes.buffer, bytes.byteOffset, n * 5);
  return {
    cellType: values.subarray(n * 2, n * 3),
    side: values.subarray(n * 4, n * 5),
  };
}

class LifEngine {
  readonly spikeCount: Int32Array;
  readonly n: number;
  private readonly dt: number;
  private readonly indptr: Int32Array;
  private readonly indices: Int32Array;
  private readonly weights: Float32Array;
  private readonly ev: number;
  private readonly eg: number;
  private readonly kc: number;
  private readonly refractorySteps: number;
  private readonly delaySteps: number;
  private readonly defaultPoisson: number;
  private readonly poissonWeight: number;
  private readonly v: Float32Array;
  private readonly g: Float32Array;
  private readonly refractory: Int16Array;
  private readonly inActive: Uint8Array;
  private readonly active: Int32Array;
  private readonly ring: Array<{ buf: Int32Array; n: number }>;
  private stimList = new Int32Array(0);
  private stimRate: Float32Array | null = null;
  private activeCount = 0;
  private stepCount = 0;
  totalSpikes = 0;

  constructor(graph: { indptr: Int32Array; indices: Int32Array; weights: Float32Array }, dt = 0.5) {
    this.n = graph.indptr.length - 1;
    this.indptr = graph.indptr;
    this.indices = graph.indices;
    this.weights = graph.weights;
    this.dt = dt;
    this.ev = Math.exp(-dt / P.TMBR);
    this.eg = Math.exp(-dt / P.TAU);
    this.kc = (P.TAU / (P.TAU - P.TMBR)) * (this.eg - this.ev);
    this.refractorySteps = Math.max(1, Math.round(P.TRFC / dt));
    this.delaySteps = Math.max(1, Math.round(P.TDLY / dt));
    this.defaultPoisson = P.RPOI * dt / 1000;
    this.poissonWeight = P.WSYN * P.FPOI;
    this.v = new Float32Array(this.n);
    this.g = new Float32Array(this.n);
    this.refractory = new Int16Array(this.n);
    this.inActive = new Uint8Array(this.n);
    this.active = new Int32Array(this.n);
    this.spikeCount = new Int32Array(this.n);
    this.ring = Array.from({ length: this.delaySteps }, () => ({
      buf: new Int32Array(1024),
      n: 0,
    }));
    this.reset();
  }

  reset() {
    this.v.fill(P.V0);
    this.g.fill(0);
    this.refractory.fill(0);
    this.inActive.fill(0);
    this.spikeCount.fill(0);
    this.activeCount = 0;
    this.stepCount = 0;
    this.totalSpikes = 0;
    for (const slot of this.ring) slot.n = 0;
    for (const i of this.stimList) this.touch(i);
  }

  stimulate(indices: Int32Array, rates?: Float32Array) {
    this.stimList = indices;
    this.stimRate = rates ?? null;
    for (const i of indices) this.touch(i);
  }

  run(milliseconds: number) {
    const steps = Math.max(1, Math.round(milliseconds / this.dt));
    for (let i = 0; i < steps; i += 1) this.advance();
  }

  private touch(i: number) {
    if (this.inActive[i]) return;
    this.inActive[i] = 1;
    this.active[this.activeCount++] = i;
  }

  private ringPush(slot: number, neuron: number) {
    const entry = this.ring[slot];
    if (entry.n === entry.buf.length) {
      const next = new Int32Array(entry.buf.length * 2);
      next.set(entry.buf);
      entry.buf = next;
    }
    entry.buf[entry.n++] = neuron;
  }

  private advance() {
    const slotIndex = this.stepCount % this.delaySteps;
    const slot = this.ring[slotIndex];

    for (let k = 0; k < slot.n; k += 1) {
      const src = slot.buf[k];
      for (let e = this.indptr[src]; e < this.indptr[src + 1]; e += 1) {
        const target = this.indices[e];
        this.g[target] += this.weights[e];
        this.touch(target);
      }
    }
    slot.n = 0;

    for (let k = 0; k < this.stimList.length; k += 1) {
      const p = this.stimRate
        ? this.stimRate[k] * (this.dt / 1000)
        : this.defaultPoisson;
      if (p > 0 && Math.random() < p) {
        const neuron = this.stimList[k];
        this.v[neuron] += this.poissonWeight;
        this.touch(neuron);
      }
    }

    let write = 0;
    for (let k = 0; k < this.activeCount; k += 1) {
      const i = this.active[k];

      if (this.refractory[i] > 0) {
        this.refractory[i] -= 1;
        this.active[write++] = i;
        continue;
      }

      const gi = this.g[i];
      const vi = this.v[i];
      const vn = P.V0 + (vi - P.V0) * this.ev + this.kc * gi;
      const gn = gi * this.eg;

      if (vn > P.VTH) {
        this.v[i] = P.VRST;
        this.g[i] = 0;
        this.refractory[i] = this.refractorySteps;
        this.spikeCount[i] += 1;
        this.totalSpikes += 1;
        this.ringPush((this.stepCount + this.delaySteps - 1) % this.delaySteps, i);
        this.active[write++] = i;
      } else {
        this.v[i] = vn;
        this.g[i] = gn;
        const dv = vn - P.V0;
        if (Math.abs(dv) < 0.02 && Math.abs(gn) < 0.02) {
          this.inActive[i] = 0;
          this.v[i] = P.V0;
          this.g[i] = 0;
        } else {
          this.active[write++] = i;
        }
      }
    }

    this.activeCount = write;
    this.stepCount += 1;
  }
}

let engine: LifEngine | null = null;
let loomLeft = new Int32Array(0);
let loomRight = new Int32Array(0);
let channels: Channels | null = null;

const group = (name: string, side?: 'left' | 'right') => {
  if (!channels?.channels[name]) return [];
  const entry = channels.channels[name];
  return side ? (entry[side] ?? []) : entry.all;
};

function sumCounts(ids: number[]) {
  if (!engine || !ids.length) return 0;
  let total = 0;
  for (const i of ids) total += engine.spikeCount[i] ?? 0;
  return total;
}

function normalizedRate(before: number, after: number, count: number, ms: number) {
  if (!count) return 0;
  const hz = Math.max(0, after - before) / count / (ms / 1000);
  return 1 - Math.exp(-hz / 40);
}

async function loadBrain() {
  post({ type: 'status', status: 'loading', progress: 0.05 });

  const [metaBytes, connBytes, signBytes, labelsBytes, channelResponse] = await Promise.all([
    fetchGz(`${BASE}/play/brain-data/meta.json.gz`),
    fetchGz(`${BASE}/play/brain-data/conn.bin.gz`),
    fetchGz(`${BASE}/play/brain-data/sign.bin.gz`),
    fetchGz(`${BASE}/data/labels.bin.gz`),
    fetch(`${BASE}/data/channels.json`),
  ]);

  if (!channelResponse.ok) throw new Error('Failed to load neural channel metadata');
  channels = await channelResponse.json() as Channels;
  const meta = JSON.parse(new TextDecoder().decode(metaBytes)) as Meta;

  post({ type: 'status', status: 'loading', progress: 0.58 });

  if (
    meta.version !== 'flywire-783' ||
    meta.threshold !== 1 ||
    meta.weight_cap !== null ||
    meta.n_neurons !== EXPECTED.neurons ||
    meta.n_edges !== EXPECTED.pairs ||
    meta.synapse_count !== EXPECTED.synapses
  ) {
    throw new Error('Unexpected full-connectome metadata');
  }

  const [connHash, signHash] = await Promise.all([sha256(connBytes), sha256(signBytes)]);
  if (connHash !== EXPECTED.connSha || signHash !== EXPECTED.signSha) {
    throw new Error('Full-connectome integrity check failed');
  }

  const graph = decodeConnectome(connBytes, meta.n_neurons, meta.n_edges, signBytes);
  const labels = decodeLabels(labelsBytes, meta.n_neurons);

  post({ type: 'status', status: 'loading', progress: 0.84 });

  const lplc2 = meta.dicts.cell_type.indexOf('LPLC2');
  const left = meta.dicts.side.indexOf('left');
  if (lplc2 < 0 || left < 0) throw new Error('LPLC2 sensory population not found');

  const l: number[] = [];
  const r: number[] = [];
  for (let i = 0; i < meta.n_neurons; i += 1) {
    if (labels.cellType[i] !== lplc2) continue;
    (labels.side[i] === left ? l : r).push(i);
  }

  loomLeft = Int32Array.from(l);
  loomRight = Int32Array.from(r);
  engine = new LifEngine(graph, 0.5);

  post({
    type: 'status',
    status: 'ready',
    progress: 1,
    neurons: meta.n_neurons,
    pairs: meta.n_edges,
    synapses: meta.synapse_count,
  });
}

function stepBrain(side: number, threat: number) {
  if (!engine || !channels) throw new Error('Whole brain is not ready');

  const turnLeft = group('turn', 'left');
  const turnRight = group('turn', 'right');
  const walk = group('walk');
  const backward = group('backward');
  const escape = group('escape');
  const stop = group('stop');
  const wing = group('wing');

  const before = {
    turnLeft: sumCounts(turnLeft),
    turnRight: sumCounts(turnRight),
    walk: sumCounts(walk),
    backward: sumCounts(backward),
    escape: sumCounts(escape),
    stop: sumCounts(stop),
    wing: sumCounts(wing),
    total: engine.totalSpikes,
  };

  const ahead = Math.max(0, 1 - Math.abs(side) * 2.2) * threat;
  const leftDrive = Math.max(side < 0 ? -side * threat : 0, ahead * 0.8);
  const rightDrive = Math.max(side > 0 ? side * threat : 0, ahead * 0.8);
  const maxHz = 150;

  const stimulus = new Int32Array(loomLeft.length + loomRight.length);
  stimulus.set(loomLeft, 0);
  stimulus.set(loomRight, loomLeft.length);
  const rates = new Float32Array(stimulus.length);

  for (let i = 0; i < loomLeft.length; i += 1) rates[i] = 5 + leftDrive * maxHz;
  for (let i = 0; i < loomRight.length; i += 1) rates[loomLeft.length + i] = 5 + rightDrive * maxHz;

  engine.stimulate(stimulus, rates);
  engine.run(32);
  engine.stimulate(new Int32Array(0));
  engine.run(18);

  const ms = 50;
  const leftRate = normalizedRate(before.turnLeft, sumCounts(turnLeft), turnLeft.length, ms);
  const rightRate = normalizedRate(before.turnRight, sumCounts(turnRight), turnRight.length, ms);

  const output = {
    turn: Math.max(-1, Math.min(1, rightRate - leftRate)),
    forward: normalizedRate(before.walk, sumCounts(walk), walk.length, ms),
    backward: normalizedRate(before.backward, sumCounts(backward), backward.length, ms),
    escape: normalizedRate(before.escape, sumCounts(escape), escape.length, ms),
    stop: normalizedRate(before.stop, sumCounts(stop), stop.length, ms),
    wing: normalizedRate(before.wing, sumCounts(wing), wing.length, ms),
    activity: 1 - Math.exp(-(engine.totalSpikes - before.total) / 500),
    spikes: engine.totalSpikes - before.total,
  };

  post({ type: 'output', output });
}

self.onmessage = async ({ data }: MessageEvent) => {
  try {
    if (data.type === 'load') {
      await loadBrain();
      return;
    }
    if (data.type === 'reset') {
      engine?.reset();
      return;
    }
    if (data.type === 'step') {
      stepBrain(Number(data.side) || 0, Number(data.threat) || 0);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    post({ type: 'error', error: message });
  }
};
