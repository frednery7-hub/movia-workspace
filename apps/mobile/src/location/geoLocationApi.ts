import { api } from '../config/api';
import type { FusedLocationPayload } from '../sensors/LocationFusion';

/**
 * Envia o resultado da fusao GPS + inercial pro backend, alimentando
 * o GeoService/NetworkState. Falha silenciosa de proposito — a
 * sincronizacao de localizacao nao deve travar nem atrasar a UI de
 * progresso da viagem, que ja funciona localmente sem depender disso.
 */
export async function postFusedLocation(
  payload: FusedLocationPayload,
  lineId?: string,
): Promise<void> {
  try {
    await api.post('/geo/location', {
      lat: payload.latitude,
      lng: payload.longitude,
      confidence: payload.confidenceScore,
      isStationary: payload.isStationary,
      isDegraded: payload.isDegraded,
      ...(lineId ? { lineId } : {}),
    });
  } catch {
    // Falha silenciosa.
  }
}
