"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransitGraphBuilder = void 0;
class TransitGraphBuilder {
    lines = new Map();
    addLine(lineId, stations) {
        this.lines.set(lineId, stations);
        return this;
    }
    exportTopology() {
        const stationMap = new Map();
        const trackSegments = [];
        for (const [lineId, stations] of this.lines) {
            const sorted = [...stations].sort((a, b) => a.sequence - b.sequence);
            for (const station of sorted) {
                const id = this.stationId(lineId, station.name);
                if (!stationMap.has(id)) {
                    stationMap.set(id, {
                        id,
                        name: station.name,
                        coordinates: station.coordinates,
                        isAccessible: station.isAccessible,
                    });
                }
            }
            for (let i = 0; i < sorted.length - 1; i++) {
                const fromId = this.stationId(lineId, sorted[i].name);
                const toId = this.stationId(lineId, sorted[i + 1].name);
                const dist = this.haversineMeters(sorted[i].coordinates, sorted[i + 1].coordinates);
                const dur = Math.round((dist / 1000 / 30) * 3600);
                trackSegments.push({
                    id: `${lineId}_SEG_${i + 1}_FWD`,
                    fromStationId: fromId,
                    toStationId: toId,
                    lineId,
                    direction: 'FORWARD',
                    sequence: i + 1,
                    distanceMeters: dist,
                    durationSeconds: dur,
                });
                trackSegments.push({
                    id: `${lineId}_SEG_${i + 1}_BWD`,
                    fromStationId: toId,
                    toStationId: fromId,
                    lineId,
                    direction: 'BACKWARD',
                    sequence: i + 1,
                    distanceMeters: dist,
                    durationSeconds: dur,
                });
            }
        }
        return {
            stations: Array.from(stationMap.values()),
            trackSegments,
        };
    }
    stationId(lineId, name) {
        const slug = name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
        return `${lineId}_${slug}`;
    }
    haversineMeters(a, b) {
        const R = 6_371_000;
        const dLat = this.toRad(b.latitude - a.latitude);
        const dLon = this.toRad(b.longitude - a.longitude);
        const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(this.toRad(a.latitude)) *
                Math.cos(this.toRad(b.latitude)) *
                Math.sin(dLon / 2) ** 2;
        return Math.round(2 * R * Math.asin(Math.sqrt(h)));
    }
    toRad(deg) {
        return (deg * Math.PI) / 180;
    }
}
exports.TransitGraphBuilder = TransitGraphBuilder;
