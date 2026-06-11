import { ALL_LINES } from "../network/lines/index.ts";
import { STATIONS } from "../network/stations.ts";

export const LINE_DIRECTIONS = {
  L1: { terminalA: "San Pablo", terminalB: "Los Dominicos" },
  L2: { terminalA: "Vespucio Norte", terminalB: "Hospital El Pino" },
  L3: {
    terminalA: "Plaza Quilicura",
    terminalB: "Fernando Castillo Velasco",
  },
  L4: { terminalA: "Tobalaba", terminalB: "Plaza de Puente Alto" },
  L4A: { terminalA: "Vicuña Mackenna", terminalB: "La Cisterna" },
  L5: { terminalA: "Plaza de Maipú", terminalB: "Vicente Valdés" },
  L6: { terminalA: "Cerrillos", terminalB: "Los Leones" },
} as const;

export type MetroLineId = keyof typeof LINE_DIRECTIONS;
export type DirectionKey = "terminalA" | "terminalB";

export interface LineDirectionResult {
  lineId: MetroLineId;
  directionTerminal: string;
  directionKey: DirectionKey;
}

export const LINE_STATION_ORDER = Object.fromEntries(
  ALL_LINES.map((line) => [
    line.line.id,
    line.platforms.map((platform) => platform.stationId),
  ]),
) as Record<MetroLineId, string[]>;

const STATION_NAME_TO_ID = new Map(
  STATIONS.map((station) => [normalizeStationName(station.name), station.id]),
);

export function isMetroLineId(lineId?: string | null): lineId is MetroLineId {
  return Boolean(lineId && lineId in LINE_DIRECTIONS);
}

export function getLineDirectionByStationId(params: {
  lineId: string;
  currentStationId: string;
  nextStationId: string;
}): LineDirectionResult | null {
  if (!isMetroLineId(params.lineId)) return null;

  const order = LINE_STATION_ORDER[params.lineId];
  const terminals = LINE_DIRECTIONS[params.lineId];
  const currentIndex = order.indexOf(params.currentStationId);
  const nextIndex = order.indexOf(params.nextStationId);

  if (currentIndex === -1 || nextIndex === -1 || currentIndex === nextIndex) {
    return null;
  }

  const directionKey: DirectionKey =
    nextIndex > currentIndex ? "terminalB" : "terminalA";

  return {
    lineId: params.lineId,
    directionKey,
    directionTerminal: terminals[directionKey],
  };
}

export function getLineDirection(params: {
  lineId: string;
  currentStationName: string;
  nextStationName: string;
}): LineDirectionResult | null {
  const currentStationId = STATION_NAME_TO_ID.get(
    normalizeStationName(params.currentStationName),
  );
  const nextStationId = STATION_NAME_TO_ID.get(
    normalizeStationName(params.nextStationName),
  );

  if (!currentStationId || !nextStationId) return null;

  return getLineDirectionByStationId({
    lineId: params.lineId,
    currentStationId,
    nextStationId,
  });
}

function normalizeStationName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
