import type { FlyAgent } from './types';

export class SpatialHash {
  private cells = new Map<string, FlyAgent[]>();

  constructor(private readonly cellSize = 72) {}

  clear() {
    this.cells.clear();
  }

  insert(agent: FlyAgent) {
    const key = this.key(agent.x, agent.y);
    const bucket = this.cells.get(key);
    if (bucket) bucket.push(agent);
    else this.cells.set(key, [agent]);
  }

  rebuild(agents: FlyAgent[]) {
    this.clear();
    for (const agent of agents) {
      if (agent.hp > 0) this.insert(agent);
    }
  }

  query(x: number, y: number, radius: number) {
    const result: FlyAgent[] = [];
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);

    for (let cy = minY; cy <= maxY; cy += 1) {
      for (let cx = minX; cx <= maxX; cx += 1) {
        const bucket = this.cells.get(`${cx},${cy}`);
        if (bucket) result.push(...bucket);
      }
    }

    return result;
  }

  private key(x: number, y: number) {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }
}
