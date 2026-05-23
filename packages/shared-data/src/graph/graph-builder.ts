import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import type {
  WeightedGraph,
  GraphNode,
  GraphEdge,
  TrackEdge,
  TransferEdge,
} from "@movia/shared-types";

const TRANSFER_PENALTY_SECONDS = 180;

type FetchResult = Awaited<ReturnType<TransitGraphBuilder["fetchTopology"]>>;
type RawStation = FetchResult["stations"][number];
type RawSegment = FetchResult["segments"][number];
type RawTransfer = FetchResult["transfers"][number];

export class TransitGraphBuilder {
  private readonly nodes = new Map<string, GraphNode>();
  private readonly edges = new Map<string, GraphEdge[]>();

  constructor(private readonly prisma: PrismaClient) {}

  async fetchTopology() {
    const [stations, segments, transfers] = await Promise.all([
      this.prisma.station.findMany({
        include: { platforms: true, entrances: true },
      }),
      this.prisma.trackSegment.findMany({
        include: { timeProfiles: true },
      }),
      this.prisma.internalTransfer.findMany(),
    ]);
    return { stations, segments, transfers };
  }

  private buildNodes(stations: RawStation[]): void {
    for (const station of stations) {
      for (const platform of station.platforms) {
        this.nodes.set(platform.id, {
          id: platform.id,
          stationId: station.id,
          lineId: platform.lineId,
          latitude: station.latitude,
          longitude: station.longitude,
          accessible: station.wheelchairAccessible,
        });
      }
    }
  }

  private buildTrackEdges(segments: RawSegment[]): void {
    for (const seg of segments) {
      const edge: TrackEdge = {
        id: seg.id,
        type: "TRACK",
        fromNodeId: seg.fromPlatformId,
        toNodeId: seg.toPlatformId,
        cost: this.computeTrackCost(seg),
        accessible: true,
        lineId: seg.lineId,
        direction: seg.direction as TrackEdge["direction"],
        distanceMeters: seg.distanceMeters,
        sequence: seg.sequence,
        timeProfiles: seg.timeProfiles.map((tp) => ({
          id: tp.id,
          segmentId: tp.segmentId,
          serviceId: tp.serviceId,
          startTimeSeconds: tp.startTimeSeconds,
          endTimeSeconds: tp.endTimeSeconds,
          durationSeconds: tp.durationSeconds,
        })),
      };
      this.addEdge(edge);
    }
  }

  private buildTransferEdges(transfers: RawTransfer[]): void {
    for (const transfer of transfers) {
      const cost = this.computeTransferCost(transfer);
      const base = {
        type: "TRANSFER" as const,
        cost,
        accessible: transfer.accessibilityFriendly,
        walkingSeconds: transfer.walkingSeconds,
        platformChange: transfer.platformChange,
      };

      this.addEdge({
        ...base,
        id: `${transfer.id}_fwd`,
        fromNodeId: transfer.fromPlatformId,
        toNodeId: transfer.toPlatformId,
      } satisfies TransferEdge);

      this.addEdge({
        ...base,
        id: `${transfer.id}_rev`,
        fromNodeId: transfer.toPlatformId,
        toNodeId: transfer.fromPlatformId,
      } satisfies TransferEdge);
    }
  }

  private computeTrackCost(seg: RawSegment): number {
    return seg.averageDurationSeconds;
  }

  private computeTransferCost(transfer: RawTransfer): number {
    return transfer.walkingSeconds + TRANSFER_PENALTY_SECONDS;
  }

  private addEdge(edge: GraphEdge): void {
    const outgoing = this.edges.get(edge.fromNodeId) ?? [];
    outgoing.push(edge);
    this.edges.set(edge.fromNodeId, outgoing);
  }

  private computeVersion(
    stations: RawStation[],
    segments: RawSegment[],
    transfers: RawTransfer[],
  ): string {
    const payload = [
      stations
        .map((s) => s.id)
        .sort()
        .join(","),
      segments
        .map((s) => s.id)
        .sort()
        .join(","),
      transfers
        .map((t) => t.id)
        .sort()
        .join(","),
    ].join("|");
    return createHash("sha256").update(payload).digest("hex").slice(0, 16);
  }

  async build(): Promise<WeightedGraph> {
    const { stations, segments, transfers } = await this.fetchTopology();
    this.buildNodes(stations);
    this.buildTrackEdges(segments);
    this.buildTransferEdges(transfers);
    return {
      nodes: this.nodes,
      edges: this.edges,
      version: this.computeVersion(stations, segments, transfers),
    };
  }
}
