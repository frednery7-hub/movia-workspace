import {
  clearActiveTripCache,
  getActiveTripCache,
  type ActiveTripCache,
  ACTIVE_TRIP_CACHE_TTL_MS,
} from './activeTripCache';

/**
 * INTEGRAÇÃO PENDENTE (C9)
 * ------------------------
 * A lógica abaixo está implementada e testada, mas AINDA NÃO ESTÁ LIGADA
 * à tela. Nada chama checkForResumableTrip() no boot hoje.
 *
 * Ligar isso exige reconstruir vários estados interdependentes do
 * index.tsx (origem, destino, activeTripState, etaData, tripStatus,
 * routeStartedAtRef) — que hoje vivem misturados num componente de 1500+
 * linhas. Fazer isso antes da refatoração da Camada 9 tem risco real de
 * restaurar a viagem num estado inconsistente, o que seria pior do que
 * não restaurar.
 *
 * Ponto de integração, depois da C9:
 *   1. No boot, chamar checkForResumableTrip()
 *   2. Se kind === 'offer', mostrar Alert (padrão já usado em settings.tsx)
 *   3. Aceitar: restaurar estado a partir de decision.cache e recalibrar
 *      routeStartedAt com recalculateProgressClockFromCache()
 *   4. Recusar: declineTripResume()
 *
 * Retomada de viagem após o app ser encerrado.
 *
 * O app já salvava a viagem ativa ao ir para o background, mas ninguém
 * lia esse cache no boot frio: a persistência existia "de ida" e não "de
 * volta". Se o sistema operacional matasse o app (comum quando fica em
 * background e o aparelho precisa de memória), a navegação se perdia
 * mesmo com os dados no disco.
 *
 * A retomada NÃO é silenciosa. Restaurar sozinho uma viagem que a pessoa
 * já terminou, ou da qual desistiu, seria assustador. O app pergunta.
 */

export type TripResumeDecision =
  | { kind: 'none' }
  | { kind: 'offer'; cache: ActiveTripCache; ageMs: number };

/**
 * Decide o que fazer com o cache encontrado no boot.
 *
 * Ignora (e limpa) cache expirado — não faz sentido oferecer a retomada
 * de uma viagem de ontem.
 */
export function decideTripResume(
  cache: ActiveTripCache | null,
  now: Date = new Date(),
): TripResumeDecision {
  if (!cache) return { kind: 'none' };

  const cachedAtMs = new Date(cache.lastUpdatedAt).getTime();
  if (!Number.isFinite(cachedAtMs)) return { kind: 'none' };

  const ageMs = now.getTime() - cachedAtMs;

  // Cache do futuro (relógio do aparelho mudou) é tratado como inválido.
  if (ageMs < 0) return { kind: 'none' };

  if (ageMs > ACTIVE_TRIP_CACHE_TTL_MS) return { kind: 'none' };

  // Um snapshot sem rota não permite retomar nada.
  if (!cache.routeSnapshot?.path?.length) return { kind: 'none' };

  return { kind: 'offer', cache, ageMs };
}

/**
 * Lê o cache no boot e decide. Cache inválido ou expirado é limpo, para
 * não ficar ocupando espaço nem ser reavaliado a cada abertura.
 */
export async function checkForResumableTrip(
  now: Date = new Date(),
): Promise<TripResumeDecision> {
  let cache: ActiveTripCache | null = null;

  try {
    cache = await getActiveTripCache();
  } catch {
    // Cache corrompido ou indisponível: o app abre normalmente.
    return { kind: 'none' };
  }

  const decision = decideTripResume(cache, now);

  if (decision.kind === 'none' && cache) {
    await clearActiveTripCache().catch(() => undefined);
  }

  return decision;
}

/** O usuário recusou a retomada: o cache morre aqui. */
export async function declineTripResume(): Promise<void> {
  await clearActiveTripCache().catch(() => undefined);
}
