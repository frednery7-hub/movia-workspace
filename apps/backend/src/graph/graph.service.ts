import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  WeightedGraph,
  GraphNode,
  GraphEdge,
  TrackEdge,
  TransferEdge,
} from '@movia/shared-types';

/**
 * GraphService — constroi e cacheia o WeightedGraph em memoria no boot.
 * Fonte de dados: PostgreSQL via Prisma.
 * Atualizado sob demanda via invalidateCache().
 */
@Injectable()
export class GraphService implements OnModuleInit {
  private readonly logger = new Logger(GraphService.name);
  private graph: WeightedGraph | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.buildGraph();
  }

  getGraph(): WeightedGraph {
    if (!this.graph) throw new Error('Graph nao inicializado');
    return this.graph;
  }

  async invalidateCache(): Promise<void> {
    await this.buildGraph();
  }

  private async buildGraph(): Promise<void> {
    this.logger.log('Construindo WeightedGraph a partir do banco...');

    const [platforms, segments, transfers] = await Promise.all([
      this.prisma.platform.findMany({ include: { station: true } }),
      this.prisma.trackSegment.findMany({ include: { timeProfiles: true } }),
      this.prisma.internalTransfer.findMany(),
    ]);

    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, GraphEdge[]>();

    // ── Nos: uma plataforma = um no do grafo ─────────────────────
    for (const platform of platforms) {
      const node: GraphNode = {
        id: platform.id,
        stationId: platform.stationId,
        lineId: platform.lineId,
        latitude: platform.station.latitude,
        longitude: platform.station.longitude,
        accessible: platform.station.wheelchairAccessible,
      };
      nodes.set(platform.id, node);
      edges.set(platform.id, []);
    }

    // ── Arestas TRACK ─────────────────────────────────────────────
    for (const seg of segments) {
      const edge: TrackEdge = {
        id: seg.id,
        type: 'TRACK',
        fromNodeId: seg.fromPlatformId,
        toNodeId: seg.toPlatformId,
        lineId: seg.lineId,
        direction: seg.direction,
        distanceMeters: seg.distanceMeters,
        sequence: seg.sequence,
        cost: seg.averageDurationSeconds,
        accessible: true,
        timeProfiles: seg.timeProfiles.map((tp) => ({
          id: tp.id,
          segmentId: tp.segmentId,
          serviceId: tp.serviceId,
          startTimeSeconds: tp.startTimeSeconds,
          endTimeSeconds: tp.endTimeSeconds,
          durationSeconds: tp.durationSeconds,
        })),
      };
      const list = edges.get(seg.fromPlatformId) ?? [];
      list.push(edge);
      edges.set(seg.fromPlatformId, list);
    }

    // ── Arestas TRANSFER ──────────────────────────────────────────
    for (const transfer of transfers) {
      const edgeFwd: TransferEdge = {
        id: transfer.id,
        type: 'TRANSFER',
        fromNodeId: transfer.fromPlatformId,
        toNodeId: transfer.toPlatformId,
        walkingSeconds: transfer.walkingSeconds,
        platformChange: transfer.platformChange,
        cost: transfer.walkingSeconds,
        accessible: transfer.accessibilityFriendly,
      };
      const edgeBwd: TransferEdge = {
        ...edgeFwd,
        id: `${transfer.id}_rev`,
        fromNodeId: transfer.toPlatformId,
        toNodeId: transfer.fromPlatformId,
      };

      const fwdList = edges.get(transfer.fromPlatformId) ?? [];
      fwdList.push(edgeFwd);
      edges.set(transfer.fromPlatformId, fwdList);

      const bwdList = edges.get(transfer.toPlatformId) ?? [];
      bwdList.push(edgeBwd);
      edges.set(transfer.toPlatformId, bwdList);
    }

    this.graph = { nodes, edges, version: new Date().toISOString() };
    this.logger.log(
      `Graph construido: ${nodes.size} nos, ${[...edges.values()].reduce((a, b) => a + b.length, 0)} arestas`,
    );
  }
}
