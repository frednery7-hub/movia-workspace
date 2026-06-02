/**
 * Utilitarios de mascaramento para logs — conformidade LGPD.
 * Nunca loga identificadores completos ou coordenadas precisas.
 */

/** Mascara deviceId: mostra apenas os 8 primeiros chars. */
export function maskId(id: string): string {
  if (!id || id.length < 8) return '***';
  return `${id.substring(0, 8)}***`;
}

/** Trunca coordenada para 2 casas decimais — precisao de ~1km. */
export function maskCoord(coord: number): string {
  return coord.toFixed(2);
}

/** Mascara payload de localizacao para logs. */
export function maskLocation(lat: number, lng: number): string {
  return `[${maskCoord(lat)}, ${maskCoord(lng)}]`;
}
