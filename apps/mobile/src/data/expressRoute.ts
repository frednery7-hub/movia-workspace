export type ExpressRouteType = 'red' | 'green' | 'common';
export type MetroExpressLine = 'L2' | 'L4' | 'L5';
export type ExpressRouteAvailability = 'active' | 'inactive' | 'unknown';

export type ExpressRouteState = {
  type: ExpressRouteType;
  availability: ExpressRouteAvailability;
};

export type ExpressRouteHolidayOptions = {
  isHoliday?: boolean | null;
};

export const EXPRESS_ROUTE_STATIONS: Record<
  MetroExpressLine,
  {
    enabled: boolean;
    schedule: {
      morning: { start: '06:00'; end: '09:00' };
      evening: { start: '18:00'; end: '21:00' };
      days: 'business_days';
    };
    stations: Record<string, ExpressRouteType>;
  }
> = {
  L2: {
    enabled: true,
    schedule: {
      morning: { start: '06:00', end: '09:00' },
      evening: { start: '18:00', end: '21:00' },
      days: 'business_days',
    },
    stations: {
      Dorsal: 'red',
      Cementerios: 'red',
      Patronato: 'red',
      "Parque O'Higgins": 'red',
      'El Llano': 'red',
      'Lo Vial': 'red',
      'Ciudad del Niño': 'red',
      'El Bosque': 'red',
      'Copa Lo Martínez': 'red',
      Einstein: 'green',
      'Cerro Blanco': 'green',
      Toesca: 'green',
      Rondizzoni: 'green',
      'San Miguel': 'green',
      Departamental: 'green',
      'El Parrón': 'green',
      Observatorio: 'green',
      'Vespucio Norte': 'common',
      Zapadores: 'common',
      'Puente Cal y Canto': 'common',
      'Santa Ana': 'common',
      'Los Héroes': 'common',
      Franklin: 'common',
      'Lo Ovalle': 'common',
      'La Cisterna': 'common',
      'Hospital El Pino': 'common',
    },
  },
  L4: {
    enabled: true,
    schedule: {
      morning: { start: '06:00', end: '09:00' },
      evening: { start: '18:00', end: '21:00' },
      days: 'business_days',
    },
    stations: {
      'Príncipe de Gales': 'red',
      'Los Orientales': 'red',
      'Los Presidentes': 'red',
      'Las Torres': 'red',
      Trinidad: 'red',
      'Los Quillayes': 'red',
      'Las Mercedes': 'red',
      'Cristóbal Colón': 'green',
      'Simón Bolívar': 'green',
      Grecia: 'green',
      Quilín: 'green',
      'Rojas Magallanes': 'green',
      'San José de la Estrella': 'green',
      'Protectora de la Infancia': 'green',
      Tobalaba: 'common',
      'Francisco Bilbao': 'common',
      'Plaza Egaña': 'common',
      Macul: 'common',
      'Vicuña Mackenna': 'common',
      'Vicente Valdés': 'common',
      'Elisa Correa': 'common',
      'Hospital Sótero del Río': 'common',
      'Plaza de Puente Alto': 'common',
    },
  },
  L5: {
    enabled: true,
    schedule: {
      morning: { start: '06:00', end: '09:00' },
      evening: { start: '18:00', end: '21:00' },
      days: 'business_days',
    },
    stations: {
      'Santiago Bueras': 'red',
      'Monte Tabor': 'red',
      Barrancas: 'red',
      Blanqueado: 'red',
      'Quinta Normal': 'red',
      'Parque Bustamante': 'red',
      'Rodrigo de Araya': 'red',
      'Camino Agrícola': 'red',
      Mirador: 'red',
      'Del Sol': 'green',
      'Las Parcelas': 'green',
      'Lo Prado': 'green',
      'Gruta de Lourdes': 'green',
      Cumming: 'green',
      'Santa Isabel': 'green',
      'Carlos Valdovinos': 'green',
      Pedrero: 'green',
      'Plaza de Maipú': 'common',
      'Laguna Sur': 'common',
      Pudahuel: 'common',
      'San Pablo': 'common',
      'Santa Ana': 'common',
      'Plaza de Armas': 'common',
      'Bellas Artes': 'common',
      Baquedano: 'common',
      Irarrázaval: 'common',
      Ñuble: 'common',
      'San Joaquín': 'common',
      'Bellavista de La Florida': 'common',
      'Vicente Valdés': 'common',
    },
  },
};

export function getExpressRouteType(
  lineId: string,
  stationName: string,
): ExpressRouteType | null {
  if (!isExpressRouteLine(lineId)) return null;

  const line = EXPRESS_ROUTE_STATIONS[lineId];
  if (!line.enabled) return null;

  return line.stations[stationName] ?? findNormalizedStationType(line.stations, stationName);
}

export function getExpressRouteAvailability(
  now: Date,
  options?: ExpressRouteHolidayOptions,
): ExpressRouteAvailability {
  // isHoliday ausente = assumir dia útil normal; null = feriado desconhecido.
  // true = feriado confirmado; false = não é feriado e calcula por horário.
  if (options?.isHoliday === null) return 'unknown';
  if (options?.isHoliday === true) return 'inactive';

  const day = now.getDay();
  const isWeekend = day === 0 || day === 6;
  if (isWeekend) return 'inactive';

  const minutes = now.getHours() * 60 + now.getMinutes();
  const isMorningActive = minutes >= 6 * 60 && minutes <= 9 * 60;
  const isEveningActive = minutes >= 18 * 60 && minutes <= 21 * 60;

  return isMorningActive || isEveningActive ? 'active' : 'inactive';
}

export function getExpressRouteState(
  lineId: string,
  stationName: string,
  now: Date = new Date(),
  options?: ExpressRouteHolidayOptions,
): ExpressRouteState | null {
  const type = getExpressRouteType(lineId, stationName);
  if (!type) return null;

  return {
    type,
    availability: getExpressRouteAvailability(now, options),
  };
}

export function getVisibleExpressRouteState(
  state: ExpressRouteState | null | undefined,
): ExpressRouteState | null {
  return state?.availability === 'active' ? state : null;
}

function isExpressRouteLine(lineId: string): lineId is MetroExpressLine {
  return lineId === 'L2' || lineId === 'L4' || lineId === 'L5';
}

function findNormalizedStationType(
  stations: Record<string, ExpressRouteType>,
  stationName: string,
): ExpressRouteType | null {
  const normalizedStationName = normalizeStationName(stationName);
  const match = Object.entries(stations).find(
    ([candidate]) => normalizeStationName(candidate) === normalizedStationName,
  );

  return match?.[1] ?? null;
}

function normalizeStationName(stationName: string): string {
  return stationName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('es-CL');
}
