"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinHeap = void 0;
/**
 * Binary Min Heap — O(log n) push/pop.
 * Não usa Array.sort() — complexidade mantida em O(E log V) no Dijkstra.
 */
class MinHeap {
    constructor() {
        this.heap = [];
    }
    get size() {
        return this.heap.length;
    }
    isEmpty() {
        return this.heap.length === 0;
    }
    peek() {
        return this.heap[0];
    }
    push(item) {
        this.heap.push(item);
        this.bubbleUp(this.heap.length - 1);
    }
    pop() {
        const top = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.sinkDown(0);
        }
        return top;
    }
    bubbleUp(i) {
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (this.heap[parent].cost <= this.heap[i].cost)
                break;
            this.swap(parent, i);
            i = parent;
        }
    }
    sinkDown(i) {
        const n = this.heap.length;
        while (true) {
            let min = i;
            const l = 2 * i + 1;
            const r = 2 * i + 2;
            if (l < n && this.heap[l].cost < this.heap[min].cost)
                min = l;
            if (r < n && this.heap[r].cost < this.heap[min].cost)
                min = r;
            if (min === i)
                break;
            this.swap(min, i);
            i = min;
        }
    }
    swap(a, b) {
        [this.heap[a], this.heap[b]] = [this.heap[b], this.heap[a]];
    }
}
exports.MinHeap = MinHeap;
//# sourceMappingURL=min-heap.js.map