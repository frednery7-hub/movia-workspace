/**
 * Schema do banco local SQLite.
 *
 * Espelha o subconjunto dos dados do backend que o app precisa para
 * funcionar sem internet: linhas, estações e a relação entre elas.
 *
 * Não replica a topologia completa do grafo (plataformas, segmentos,
 * time profiles) — o cálculo de rota offline é uma fase posterior.
 * Por enquanto, o objetivo é: buscar estação, ver linhas, saber onde
 * você está.
 */

export const SCHEMA_VERSION = 2;

export const CREATE_TABLES = `
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lines (
    id     TEXT PRIMARY KEY NOT NULL,
    name   TEXT NOT NULL,
    color  TEXT NOT NULL,
    status TEXT
  );

  CREATE TABLE IF NOT EXISTS stations (
    id              TEXT PRIMARY KEY NOT NULL,
    name            TEXT NOT NULL,
    name_normalized TEXT NOT NULL,
    short_code      TEXT NOT NULL,
    latitude        REAL NOT NULL,
    longitude       REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS station_lines (
    station_id TEXT NOT NULL,
    line_id    TEXT NOT NULL,
    PRIMARY KEY (station_id, line_id),
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    FOREIGN KEY (line_id)    REFERENCES lines(id)    ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_stations_name ON stations(name);
  CREATE INDEX IF NOT EXISTS idx_stations_name_norm ON stations(name_normalized);
  CREATE INDEX IF NOT EXISTS idx_stations_coords ON stations(latitude, longitude);
  CREATE INDEX IF NOT EXISTS idx_station_lines_line ON station_lines(line_id);
`;

/** Chaves usadas na tabela `meta`. */
export const META_KEYS = {
  SCHEMA_VERSION: 'schema_version',
  STATIONS_SYNCED_AT: 'stations_synced_at',
  LINES_SYNCED_AT: 'lines_synced_at',
} as const;
