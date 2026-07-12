import { HttpException } from '@nestjs/common';

import { ErrorCode, type ErrorCodeValue } from './error-codes';

/**
 * Exceção de domínio com código estável.
 *
 * Use quando o cliente precisa distinguir programaticamente o motivo da
 * falha — por exemplo, "não existe rota entre estas estações" (mostrar
 * uma tela específica) versus "estação não encontrada" (revalidar a
 * busca). Ambos são 404, mas exigem reações diferentes.
 *
 * Para erros sem tratamento específico do cliente, as exceções padrão do
 * Nest continuam válidas: o filter atribui um código genérico pelo
 * status HTTP.
 */
export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCodeValue,
    message: string,
    status: number,
  ) {
    super(message, status);
  }

  static noRouteFound(
    message = 'Nao existe rota entre as estacoes informadas.',
  ) {
    return new AppException(ErrorCode.NO_ROUTE_FOUND, message, 404);
  }

  static stationNotFound(stationId: string) {
    return new AppException(
      ErrorCode.STATION_NOT_FOUND,
      `Estacao nao encontrada: ${stationId}`,
      404,
    );
  }

  static lineNotFound(lineId: string) {
    return new AppException(
      ErrorCode.LINE_NOT_FOUND,
      `Linha nao encontrada: ${lineId}`,
      404,
    );
  }

  static externalServiceUnavailable(service: string) {
    return new AppException(
      ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
      `Servico externo indisponivel: ${service}`,
      503,
    );
  }
}
