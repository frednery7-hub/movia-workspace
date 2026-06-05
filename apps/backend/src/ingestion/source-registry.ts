export type IngestionSourceType = 'GTFS_RT';

export interface IngestionSource {
  id: string;
  name: string;
  type: IngestionSourceType;
  enabled: boolean;
  url: string;
  pollIntervalSeconds: number;
  timeoutSeconds: number;
  cityId: string;
}

/**
 * Catálogo de fontes oficiais autorizadas.
 * Toda ingestão deve originar de uma entrada registrada aqui.
 * Para desabilitar uma fonte comprometida: enabled: false — sem alterar código.
 */
export const SOURCE_REGISTRY: IngestionSource[] = [
  {
    id: 'metro_santiago_gtfs_rt',
    name: 'Metro de Santiago — GTFS-RT',
    type: 'GTFS_RT',
    enabled: false,
    url: '',
    pollIntervalSeconds: 60,
    timeoutSeconds: 10,
    cityId: 'santiago',
  },
  {
    id: 'subte_buenosaires_gtfs_rt',
    name: 'Subte Buenos Aires — GTFS-RT',
    type: 'GTFS_RT',
    enabled: false,
    url: '',
    pollIntervalSeconds: 60,
    timeoutSeconds: 10,
    cityId: 'buenos-aires',
  },
];

export function getActiveSources(): IngestionSource[] {
  return SOURCE_REGISTRY.filter((s) => s.enabled);
}

export function getSourceById(id: string): IngestionSource | undefined {
  return SOURCE_REGISTRY.find((s) => s.id === id);
}
