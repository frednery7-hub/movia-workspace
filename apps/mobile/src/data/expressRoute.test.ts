import {
  getExpressRouteAvailability,
  getExpressRouteState,
  getExpressRouteType,
} from './expressRoute';
import { getExpressRouteBadgeLabel } from './expressRouteDisplay';

const t = (key: string) => ({
  'expressRoute.label': 'Ruta Expresa',
  'expressRoute.red': 'Ruta Roja',
  'expressRoute.green': 'Ruta Verde',
  'expressRoute.common': 'Estación común',
  'expressRoute.inactiveSuffix': 'fuera de horario',
  'expressRoute.unknownSchedule': 'horario no confirmado',
}[key] ?? key);

describe('getExpressRouteType', () => {
  it('retorna red, green e common para L2', () => {
    expect(getExpressRouteType('L2', 'Dorsal')).toBe('red');
    expect(getExpressRouteType('L2', 'Einstein')).toBe('green');
    expect(getExpressRouteType('L2', 'Santa Ana')).toBe('common');
  });

  it('retorna red, green e common para L4', () => {
    expect(getExpressRouteType('L4', 'Las Mercedes')).toBe('red');
    expect(getExpressRouteType('L4', 'Protectora de la Infancia')).toBe('green');
    expect(getExpressRouteType('L4', 'Tobalaba')).toBe('common');
  });

  it('retorna red, green e common para L5', () => {
    expect(getExpressRouteType('L5', 'Monte Tabor')).toBe('red');
    expect(getExpressRouteType('L5', 'Pedrero')).toBe('green');
    expect(getExpressRouteType('L5', 'Baquedano')).toBe('common');
  });

  it('normaliza acentos e apóstrofos sem mudar o contrato do dataset', () => {
    expect(getExpressRouteType('L2', "Parque O’Higgins")).toBe('red');
    expect(getExpressRouteType('L4', 'Cristobal Colon')).toBe('green');
    expect(getExpressRouteType('L5', 'Nuble')).toBe('common');
  });

  it('retorna null para linha sem Ruta Expresa ou estação inexistente', () => {
    expect(getExpressRouteType('L1', 'San Pablo')).toBeNull();
    expect(getExpressRouteType('L4', 'Santa Julia')).toBeNull();
  });
});

describe('getExpressRouteAvailability', () => {
  it('retorna active em segunda-feira 07:00', () => {
    expect(getExpressRouteAvailability(new Date('2026-06-15T07:00:00'))).toBe('active');
  });

  it('retorna active em segunda-feira 19:00', () => {
    expect(getExpressRouteAvailability(new Date('2026-06-15T19:00:00'))).toBe('active');
  });

  it('retorna inactive em segunda-feira 12:00', () => {
    expect(getExpressRouteAvailability(new Date('2026-06-15T12:00:00'))).toBe('inactive');
  });

  it('retorna inactive no sábado 07:00', () => {
    expect(getExpressRouteAvailability(new Date('2026-06-13T07:00:00'))).toBe('inactive');
  });

  it('retorna inactive no domingo 19:00', () => {
    expect(getExpressRouteAvailability(new Date('2026-06-14T19:00:00'))).toBe('inactive');
  });

  it('retorna inactive em feriado conhecido', () => {
    expect(getExpressRouteAvailability(new Date('2026-06-15T07:00:00'), { isHoliday: true })).toBe('inactive');
  });

  it('retorna unknown em feriado desconhecido', () => {
    expect(getExpressRouteAvailability(new Date('2026-06-15T07:00:00'), { isHoliday: null })).toBe('unknown');
  });

  it('trata isHoliday ausente ou false como dia útil normal', () => {
    expect(getExpressRouteAvailability(new Date('2026-06-15T07:00:00'))).toBe('active');
    expect(getExpressRouteAvailability(new Date('2026-06-15T07:00:00'), { isHoliday: false })).toBe('active');
  });
});

describe('getExpressRouteState', () => {
  it('combina tipo e disponibilidade para badge na busca e timeline', () => {
    expect(getExpressRouteState('L5', 'Pedrero', new Date('2026-06-15T07:00:00'))).toEqual({
      type: 'green',
      availability: 'active',
    });
  });

  it('retorna estado inactive para badge fora de horário', () => {
    expect(getExpressRouteState('L2', 'Dorsal', new Date('2026-06-15T12:00:00'))).toEqual({
      type: 'red',
      availability: 'inactive',
    });
  });

  it('retorna estado unknown sem induzir uso quando feriado é indefinido', () => {
    expect(getExpressRouteState('L4', 'Tobalaba', new Date('2026-06-15T07:00:00'), { isHoliday: null })).toEqual({
      type: 'common',
      availability: 'unknown',
    });
  });

  it('retorna null para linha sem Ruta Expresa, então a UI não mostra badge', () => {
    expect(getExpressRouteState('L1', 'Universidad de Chile', new Date('2026-06-15T07:00:00'))).toBeNull();
  });
});

describe('getExpressRouteBadgeLabel', () => {
  it('monta label ativo para a busca e timeline', () => {
    expect(getExpressRouteBadgeLabel('red', 'active', t)).toBe('Ruta Roja');
  });

  it('monta label desativado fora de horário', () => {
    expect(getExpressRouteBadgeLabel('green', 'inactive', t)).toBe('Ruta Verde · fuera de horario');
  });

  it('monta label neutro para horário desconhecido', () => {
    expect(getExpressRouteBadgeLabel('common', 'unknown', t)).toBe('Ruta Expresa · horario no confirmado');
  });
});
