/**
 * Códigos de erro estáveis, expostos no envelope de resposta.
 *
 * O cliente decide o que fazer com base no `code`, nunca na `message`:
 * a mensagem é para humanos e pode mudar (inclusive ser traduzida) sem
 * quebrar nada; o código é contrato.
 *
 * Regra: um código só é removido ou tem seu significado alterado em uma
 * versão maior da API. Adicionar novos códigos é sempre seguro.
 */
export const ErrorCode = {
  // Genéricos por status — usados quando não há um código mais específico
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  TIMEOUT: 'TIMEOUT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  // Domínio: rota e ETA
  NO_ROUTE_FOUND: 'NO_ROUTE_FOUND',
  STATION_NOT_FOUND: 'STATION_NOT_FOUND',
  LINE_NOT_FOUND: 'LINE_NOT_FOUND',

  // Domínio: autenticação
  INVALID_TOKEN: 'INVALID_TOKEN',
  SESSION_BLOCKED: 'SESSION_BLOCKED',

  // Domínio: serviços externos (Places, Geocoding)
  EXTERNAL_SERVICE_UNAVAILABLE: 'EXTERNAL_SERVICE_UNAVAILABLE',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Envelope de erro devolvido em toda resposta de falha. */
export interface ErrorEnvelope {
  code: ErrorCodeValue;
  message: string;
  statusCode: number;
  path: string;
  timestamp: string;
  /** Permite ao usuário/suporte cruzar o erro com os logs do servidor. */
  correlationId?: string;
}

/** Código genérico correspondente a um status HTTP, quando não há um específico. */
export function defaultCodeForStatus(status: number): ErrorCodeValue {
  switch (status) {
    case 400:
      return ErrorCode.BAD_REQUEST;
    case 401:
      return ErrorCode.UNAUTHORIZED;
    case 403:
      return ErrorCode.FORBIDDEN;
    case 404:
      return ErrorCode.NOT_FOUND;
    case 408:
      return ErrorCode.TIMEOUT;
    case 429:
      return ErrorCode.RATE_LIMITED;
    case 503:
      return ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE;
    default:
      return ErrorCode.INTERNAL_ERROR;
  }
}
