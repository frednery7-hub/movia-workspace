import { AsyncLocalStorage } from 'async_hooks';

/**
 * Contexto da requisição atual, propagado automaticamente por toda a
 * cadeia assíncrona (controllers, services, repositories).
 *
 * Sem isso, o correlationId só existiria no interceptor: um log emitido
 * dentro de um service não teria como saber a qual requisição pertence,
 * tornando impossível rastrear uma requisição inteira nos logs.
 *
 * AsyncLocalStorage é a API nativa do Node para isso — não depende de
 * passar o contexto manualmente por parâmetro em cada camada.
 */

export interface RequestContext {
  correlationId: string;
  method?: string;
  route?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** Executa `fn` com o contexto ativo. Tudo dentro dele enxerga o contexto. */
export function runWithRequestContext<T>(
  context: RequestContext,
  fn: () => T,
): T {
  return storage.run(context, fn);
}

/** Contexto da requisição atual, ou undefined fora de uma requisição. */
export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

/** Atalho para o correlationId atual. */
export function getCorrelationId(): string | undefined {
  return storage.getStore()?.correlationId;
}
