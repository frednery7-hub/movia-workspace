import type {
  WeightedGraph,
  GraphEdge,
  WalkEdge,
  NearestEntranceResult,
  RouteResult,
  RouteSegment,
} from "@movia/shared-types";
import { MinHeap } from "./min-heap";

const VIRTUAL_ORIGIN_ID = "__virtual_origin__";
const VIRTUAL_DESTINATION_ID = "__virtual_destination__";
const WALKING_SPEED_MS = 1.4;

export interface RouteQuery {
  origin: NearestEntranceResult;
  destination: NearestEntranceResult;
  accessibleOnly?: boolean;
}

interface PrevEntry {
  nodeId: string;
  edge: GraphEdge;
}

export class RouteEngine {
  constructor(private readonly graph: WeightedGraph) {}

  route(query: RouteQuery): RouteResult | null {
    const { augmented, originNodeId, destinationNodeId } = this.injectWalkEdges(
      query.origin,
      query.destination,
    );
    return this.dijkstra(
      augmented,
      originNodeId,
      destinationNodeId,
      query.accessibleOnly ?? false,
    );
  }

  private injectWalkEdges(
    origin: NearestEntranceResult,
    destination: NearestEntranceResult,
  ): {
    augmented: WeightedGraph;
    originNodeId: string;
    destinationNodeId: string;
  } {
    const originPlatforms = [...this.graph.nodes.values()].filter(
      (n) => n.stationId === origin.stationId,
    );
    const destPlatforms = [...this.graph.nodes.values()].filter(
      (n) => n.stationId === destination.stationId,
    );

    const originEdges: WalkEdge[] = originPlatforms.map((platform) => ({
      id: `walk_origin_${platform.id}`,
      type: "WALK" as const,
      fromNodeId: VIRTUAL_ORIGIN_ID,
      toNodeId: platform.id,
      cost: Math.round(origin.distanceMeters / WALKING_SPEED_MS),
      accessible: true,
      distanceMeters: origin.distanceMeters,
      durationSeconds: Math.round(origin.distanceMeters / WALKING_SPEED_MS),
    }));

    const destEdges: WalkEdge[] = destPlatforms.map((platform) => ({
      id: `walk_destination_${platform.id}`,
      type: "WALK" as const,
      fromNodeId: platform.id,
      toNodeId: VIRTUAL_DESTINATION_ID,
      cost: Math.round(destination.distanceMeters / WALKING_SPEED_MS),
      accessible: true,
      distanceMeters: destination.distanceMeters,
      durationSeconds: Math.round(
        destination.distanceMeters / WALKING_SPEED_MS,
      ),
    }));

    const augmentedEdges = new Map(this.graph.edges);
    augmentedEdges.set(VIRTUAL_ORIGIN_ID, originEdges);

    for (const edge of destEdges) {
      const existing = augmentedEdges.get(edge.fromNodeId) ?? [];
      augmentedEdges.set(edge.fromNodeId, [...existing, edge]);
    }

    return {
      augmented: { ...this.graph, edges: augmentedEdges },
      originNodeId: VIRTUAL_ORIGIN_ID,
      destinationNodeId: VIRTUAL_DESTINATION_ID,
    };
  }

  private dijkstra(
    graph: WeightedGraph,
    originId: string,
    destinationId: string,
    accessibleOnly: boolean,
  ): RouteResult | null {
    const dist = new Map<string, number>();
    const prev = new Map<string, PrevEntry>();
    const pq = new MinHeap();

    dist.set(originId, 0);
    pq.push({ id: originId, cost: 0 });

    while (!pq.isEmpty()) {
      const { id: current, cost } = pq.pop();

      if (current === destinationId) break;
      if (cost > (dist.get(current) ?? Infinity)) continue;

      for (const edge of graph.edges.get(current) ?? []) {
        if (accessibleOnly && !edge.accessible) continue;

        const newCost = cost + edge.cost;
        if (newCost < (dist.get(edge.toNodeId) ?? Infinity)) {
          dist.set(edge.toNodeId, newCost);
          prev.set(edge.toNodeId, { nodeId: current, edge });
          pq.push({ id: edge.toNodeId, cost: newCost });
        }
      }
    }

    if (!dist.has(destinationId)) return null;
    return this.reconstructPath(graph, prev, originId, destinationId);
  }

  private reconstructPath(
    graph: WeightedGraph,
    prev: Map<string, PrevEntry>,
    originId: string,
    destinationId: string,
  ): RouteResult {
    const segments: RouteSegment[] = [];
    let current = destinationId;

    while (current !== originId) {
      const entry = prev.get(current);
      if (!entry) break;

      const fromNode = graph.nodes.get(entry.nodeId);
      const toNode = graph.nodes.get(current);

      // Skipa arestas de nos virtuais mas continua percorrendo o caminho
      if (fromNode && toNode) {
        segments.unshift({
          edge: entry.edge,
          fromNode,
          toNode,
          cumulativeCost: 0,
        });
      }

      current = entry.nodeId;
    }

    let cumulative = 0;
    for (const seg of segments) {
      cumulative += seg.edge.cost;
      seg.cumulativeCost = cumulative;
    }

    return this.buildResult(segments);
  }

  private buildResult(segments: RouteSegment[]): RouteResult {
    const totalCost = segments.reduce((acc, s) => acc + s.edge.cost, 0);

    const totalDistanceMeters = segments.reduce((acc, s) => {
      if (s.edge.type === "TRACK" || s.edge.type === "WALK") {
        return acc + s.edge.distanceMeters;
      }
      return acc;
    }, 0);

    const transferCount = segments.filter(
      (s) => s.edge.type === "TRANSFER",
    ).length;
    const accessible = segments.every((s) => s.edge.accessible);

    return {
      segments,
      totalCost,
      totalDurationSeconds: totalCost,
      totalDistanceMeters,
      transferCount,
      accessible,
    };
  }
}
