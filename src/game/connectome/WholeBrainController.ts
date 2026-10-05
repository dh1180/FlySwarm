import type { WholeBrainOutput, WholeBrainSnapshot } from '../types';

const ZERO_OUTPUT: WholeBrainOutput = {
  turn: 0,
  forward: 0,
  backward: 0,
  escape: 0,
  stop: 0,
  wing: 0,
  activity: 0,
  spikes: 0,
};

export class WholeBrainController {
  private readonly worker: Worker;
  private busy = false;
  private started = false;
  private snapshot: WholeBrainSnapshot = {
    status: 'idle',
    progress: 0,
    neurons: 0,
    pairs: 0,
    synapses: 0,
    error: null,
    output: { ...ZERO_OUTPUT },
  };

  constructor() {
    this.worker = new Worker(
      new URL('./connectomeBoss.worker.ts', import.meta.url),
      { type: 'module' },
    );

    this.worker.onmessage = ({ data }) => {
      if (data.type === 'status') {
        this.snapshot = {
          ...this.snapshot,
          status: data.status,
          progress: data.progress ?? this.snapshot.progress,
          neurons: data.neurons ?? this.snapshot.neurons,
          pairs: data.pairs ?? this.snapshot.pairs,
          synapses: data.synapses ?? this.snapshot.synapses,
          error: data.error ?? null,
        };
      }

      if (data.type === 'output') {
        this.busy = false;
        this.snapshot = {
          ...this.snapshot,
          status: 'ready',
          progress: 1,
          output: data.output,
        };
      }

      if (data.type === 'error') {
        this.busy = false;
        this.snapshot = {
          ...this.snapshot,
          status: 'error',
          error: data.error || 'Unknown connectome worker error',
        };
      }
    };

    this.worker.onerror = (event) => {
      this.busy = false;
      this.snapshot = {
        ...this.snapshot,
        status: 'error',
        error: event.message || 'Connectome worker crashed',
      };
    };
  }

  load() {
    if (this.started) return;
    this.started = true;
    this.snapshot = { ...this.snapshot, status: 'loading', progress: 0.02 };
    this.worker.postMessage({ type: 'load' });
  }

  step(side: number, threat: number) {
    if (this.snapshot.status !== 'ready' || this.busy) return;
    this.busy = true;
    this.worker.postMessage({
      type: 'step',
      side: Math.max(-1, Math.min(1, side)),
      threat: Math.max(0, Math.min(1, threat)),
    });
  }

  reset() {
    if (this.snapshot.status !== 'ready') return;
    this.busy = false;
    this.snapshot = {
      ...this.snapshot,
      output: { ...ZERO_OUTPUT },
    };
    this.worker.postMessage({ type: 'reset' });
  }

  getSnapshot(): WholeBrainSnapshot {
    return {
      ...this.snapshot,
      output: { ...this.snapshot.output },
    };
  }

  destroy() {
    this.worker.terminate();
  }
}
