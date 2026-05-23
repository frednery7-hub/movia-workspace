export interface HeapItem {
  id: string;
  cost: number;
}

/**
 * Binary Min Heap — O(log n) push/pop.
 * Não usa Array.sort() — complexidade mantida em O(E log V) no Dijkstra.
 */
export class MinHeap {
  private readonly heap: HeapItem[] = [];

  get size(): number {
    return this.heap.length;
  }
  isEmpty(): boolean {
    return this.heap.length === 0;
  }
  peek(): HeapItem {
    return this.heap[0];
  }

  push(item: HeapItem): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): HeapItem {
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.sinkDown(0);
    }
    return top;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[parent].cost <= this.heap[i].cost) break;
      this.swap(parent, i);
      i = parent;
    }
  }

  private sinkDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      let min = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.heap[l].cost < this.heap[min].cost) min = l;
      if (r < n && this.heap[r].cost < this.heap[min].cost) min = r;
      if (min === i) break;
      this.swap(min, i);
      i = min;
    }
  }

  private swap(a: number, b: number): void {
    [this.heap[a], this.heap[b]] = [this.heap[b], this.heap[a]];
  }
}
