import { useState, useEffect } from 'react';
import { calculateCurrentTariff, TariffStatus } from '../utils/tariff';

/**
 * Hook que retorna a tarifa atual e se atualiza automaticamente
 * a cada minuto via setInterval — zero rede, zero bateria extra.
 */
export function useTariffStatus(): TariffStatus {
  const [status, setStatus] = useState<TariffStatus>(() =>
    calculateCurrentTariff(new Date()),
  );

  useEffect(() => {
    const tick = () => setStatus(calculateCurrentTariff(new Date()));
    const interval = setInterval(tick, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return status;
}
