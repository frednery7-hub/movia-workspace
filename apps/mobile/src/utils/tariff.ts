export type FarePeriod = 'punta' | 'valle' | 'bajo';

export interface TariffStatus {
  period: FarePeriod;
  timeRange: string;
  minutesUntilChange: number;
}

/**
 * Calcula a tarifa atual do Metro de Santiago.
 * Função pura — sem efeitos colaterais, 100% testável.
 *
 * Regras (dias úteis):
 *   Bajo  → 06:00–06:59
 *   Punta → 07:00–08:59
 *   Valle → 09:00–17:59
 *   Punta → 18:00–19:59
 *   Valle → 20:00–20:44
 *   Bajo  → 20:45–23:00
 *
 * Fins de semana e feriados: Bajo o dia todo.
 */
export function calculateCurrentTariff(date: Date): TariffStatus {
  const h = date.getHours();
  const m = date.getMinutes();
  const day = date.getDay(); // 0=Dom, 6=Sab
  const total = h * 60 + m;

  const isWeekend = day === 0 || day === 6;

  if (isWeekend) {
    const minutesUntilMidnight = 24 * 60 - total;
    return { period: 'valle', timeRange: 'Fin de semana', minutesUntilChange: minutesUntilMidnight };
  }

  if (total >= 6 * 60 && total < 7 * 60) {
    return { period: 'bajo',  timeRange: '06:00 – 06:59', minutesUntilChange: 7 * 60 - total };
  }
  if (total >= 7 * 60 && total < 9 * 60) {
    return { period: 'punta', timeRange: '07:00 – 08:59', minutesUntilChange: 9 * 60 - total };
  }
  if (total >= 9 * 60 && total < 18 * 60) {
    return { period: 'valle', timeRange: '09:00 – 17:59', minutesUntilChange: 18 * 60 - total };
  }
  if (total >= 18 * 60 && total < 20 * 60) {
    return { period: 'punta', timeRange: '18:00 – 19:59', minutesUntilChange: 20 * 60 - total };
  }
  if (total >= 20 * 60 && total < 20 * 60 + 45) {
    return { period: 'valle', timeRange: '20:00 – 20:44', minutesUntilChange: 20 * 60 + 45 - total };
  }
  if (total >= 20 * 60 + 45 && total < 23 * 60) {
    return { period: 'bajo',  timeRange: '20:45 – 23:00', minutesUntilChange: 23 * 60 - total };
  }

  // Fora do horário de operação
  return { period: 'bajo', timeRange: 'Fora de operação', minutesUntilChange: 0 };
}
