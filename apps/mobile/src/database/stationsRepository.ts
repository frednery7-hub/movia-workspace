import { getDatabase, getMetaValue, setMetaValue } from './database';
import { normalizeSearchText } from '../poi/search/normalizeSearchText';
import { META_KEYS } from './schema';
import type { StationResult } from '../hooks/useStations';
import type { LineResponse } from '../hooks/useLines';

/** Quanto tempo os dados locais são considerados frescos. */
const FRESHNESS_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

interface StationRow {
  id: string;
  name: string;
  short_code: string;
  latitude: number;
  longitude: number;
}

interface LineRow {
  id: string;
  name: string;
  color: string;
  status: string | null;
}

function rowToStation(row: StationRow, lines: string[]): StationResult {
  return {
    id: row.id,
    name: row.name,
    shortCode: row.short_code,
    latitude: row.latitude,
    longitude: row.longitude,
    lines,
  };
}

/**
 * Substitui todas as estações locais pelas do servidor.
 *
 * Usa uma transação: ou tudo entra, ou nada muda. Sem isso, uma falha
 * no meio deixaria o banco com metade das estações — pior que ter os
 * dados antigos.
 */
export async function saveStations(stations: StationResult[]): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM station_lines; DELETE FROM stations;');

    for (const station of stations) {
      await db.runAsync(
        'INSERT INTO stations (id, name, name_normalized, short_code, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)',
        [station.id, station.name, normalizeSearchText(station.name), station.shortCode, station.latitude, station.longitude],
      );

      for (const lineId of station.lines ?? []) {
        await db.runAsync(
          'INSERT OR IGNORE INTO station_lines (station_id, line_id) VALUES (?, ?)',
          [station.id, lineId],
        );
      }
    }
  });

  await setMetaValue(META_KEYS.STATIONS_SYNCED_AT, String(Date.now()));
}

export async function saveLines(lines: LineResponse[]): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM lines;');
    for (const line of lines) {
      await db.runAsync(
        'INSERT INTO lines (id, name, color, status) VALUES (?, ?, ?, ?)',
        [line.id, line.name, line.color, line.status ?? null],
      );
    }
  });

  await setMetaValue(META_KEYS.LINES_SYNCED_AT, String(Date.now()));
}

export async function getAllStations(): Promise<StationResult[]> {
  const db = await getDatabase();

  const stationRows = await db.getAllAsync<StationRow>(
    'SELECT id, name, short_code, latitude, longitude FROM stations ORDER BY name',
  );

  if (stationRows.length === 0) return [];

  const lineRows = await db.getAllAsync<{ station_id: string; line_id: string }>(
    'SELECT station_id, line_id FROM station_lines',
  );

  const linesByStation = new Map<string, string[]>();
  for (const row of lineRows) {
    const existing = linesByStation.get(row.station_id);
    if (existing) {
      existing.push(row.line_id);
    } else {
      linesByStation.set(row.station_id, [row.line_id]);
    }
  }

  return stationRows.map(row => rowToStation(row, linesByStation.get(row.id) ?? []));
}

export async function getAllLines(): Promise<LineResponse[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<LineRow>(
    'SELECT id, name, color, status FROM lines ORDER BY id',
  );
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    color: row.color,
    status: (row.status ?? undefined) as LineResponse['status'],
  }));
}

/**
 * Busca estações por nome, direto no SQLite.
 *
 * Case-insensitive e sem acento é tratado no SQL com LIKE simples —
 * o SQLite do Expo não tem ICU, então "Ñuble" não casa com "nuble".
 * A normalização de acentos acontece na camada de busca, em JS.
 */
export async function searchStationsByName(query: string): Promise<StationResult[]> {
  const db = await getDatabase();
  // Normaliza a query do mesmo jeito que o name_normalized foi gravado,
  // para que 'nuble' encontre 'Ñuble' e 'bio bio' encontre 'Bío Bío'.
  const pattern = `%${normalizeSearchText(query)}%`;

  const rows = await db.getAllAsync<StationRow>(
    'SELECT id, name, short_code, latitude, longitude FROM stations WHERE name_normalized LIKE ? ORDER BY name LIMIT 20',
    [pattern],
  );

  if (rows.length === 0) return [];

  const ids = rows.map(r => r.id);
  const placeholders = ids.map(() => '?').join(',');
  const lineRows = await db.getAllAsync<{ station_id: string; line_id: string }>(
    `SELECT station_id, line_id FROM station_lines WHERE station_id IN (${placeholders})`,
    ids,
  );

  const linesByStation = new Map<string, string[]>();
  for (const row of lineRows) {
    const existing = linesByStation.get(row.station_id);
    if (existing) {
      existing.push(row.line_id);
    } else {
      linesByStation.set(row.station_id, [row.line_id]);
    }
  }

  return rows.map(row => rowToStation(row, linesByStation.get(row.id) ?? []));
}

export async function hasStations(): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM stations',
  );
  return (row?.count ?? 0) > 0;
}

/** True se os dados locais foram sincronizados recentemente. */
export async function areStationsFresh(): Promise<boolean> {
  const syncedAt = await getMetaValue(META_KEYS.STATIONS_SYNCED_AT);
  if (!syncedAt) return false;
  return Date.now() - Number(syncedAt) < FRESHNESS_MS;
}
