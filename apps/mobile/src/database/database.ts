import * as SQLite from 'expo-sqlite';

import { CREATE_TABLES, META_KEYS, SCHEMA_VERSION } from './schema';

const DATABASE_NAME = 'movia.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Abre (ou cria) o banco local, aplicando o schema na primeira vez.
 *
 * A promise é memoizada: chamadas concorrentes reusam a mesma conexão,
 * evitando abrir o banco várias vezes durante o boot do app.
 */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openAndMigrate();
  }
  return databasePromise;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync(CREATE_TABLES);

  const currentVersion = await getMeta(db, META_KEYS.SCHEMA_VERSION);
  if (currentVersion !== String(SCHEMA_VERSION)) {
    await db.execAsync(`
      DELETE FROM station_lines;
      DELETE FROM stations;
      DELETE FROM lines;
    `);
    await setMeta(db, META_KEYS.SCHEMA_VERSION, String(SCHEMA_VERSION));
  }

  return db;
}

async function getMeta(
  db: SQLite.SQLiteDatabase,
  key: string,
): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

async function setMeta(
  db: SQLite.SQLiteDatabase,
  key: string,
  value: string,
): Promise<void> {
  await db.runAsync(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

export async function getMetaValue(key: string): Promise<string | null> {
  const db = await getDatabase();
  return getMeta(db, key);
}

export async function setMetaValue(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  return setMeta(db, key, value);
}

/**
 * Apaga tudo. Usado quando o usuário revoga consentimento ou pede
 * exclusão de dados.
 */
export async function clearDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM station_lines;
    DELETE FROM stations;
    DELETE FROM lines;
    DELETE FROM meta;
  `);
}

/** Fecha a conexão. Usado em testes. */
export async function closeDatabase(): Promise<void> {
  if (!databasePromise) return;
  const db = await databasePromise;
  await db.closeAsync();
  databasePromise = null;
}
