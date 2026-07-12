import { AppException } from './app.exception';
import { ErrorCode, defaultCodeForStatus } from './error-codes';

describe('Error codes e AppException', () => {
  describe('defaultCodeForStatus', () => {
    it('mapeia os status HTTP conhecidos', () => {
      expect(defaultCodeForStatus(400)).toBe(ErrorCode.BAD_REQUEST);
      expect(defaultCodeForStatus(401)).toBe(ErrorCode.UNAUTHORIZED);
      expect(defaultCodeForStatus(403)).toBe(ErrorCode.FORBIDDEN);
      expect(defaultCodeForStatus(404)).toBe(ErrorCode.NOT_FOUND);
      expect(defaultCodeForStatus(408)).toBe(ErrorCode.TIMEOUT);
      expect(defaultCodeForStatus(429)).toBe(ErrorCode.RATE_LIMITED);
      expect(defaultCodeForStatus(503)).toBe(
        ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
      );
    });

    it('cai em INTERNAL_ERROR para status desconhecidos', () => {
      expect(defaultCodeForStatus(500)).toBe(ErrorCode.INTERNAL_ERROR);
      expect(defaultCodeForStatus(418)).toBe(ErrorCode.INTERNAL_ERROR);
    });
  });

  describe('AppException', () => {
    it('carrega código estável junto do status', () => {
      const err = AppException.noRouteFound();
      expect(err.code).toBe(ErrorCode.NO_ROUTE_FOUND);
      expect(err.getStatus()).toBe(404);
    });

    it('distingue "sem rota" de "estação não encontrada" — ambos 404', () => {
      const noRoute = AppException.noRouteFound();
      const notFound = AppException.stationNotFound('st_inexistente');

      // Mesmo status, códigos diferentes: o cliente reage de forma
      // diferente a cada um (tela de "sem rota" vs revalidar a busca).
      expect(noRoute.getStatus()).toBe(notFound.getStatus());
      expect(noRoute.code).not.toBe(notFound.code);
    });

    it('serviço externo indisponível vira 503 com código próprio', () => {
      const err = AppException.externalServiceUnavailable('Google Places');
      expect(err.code).toBe(ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE);
      expect(err.getStatus()).toBe(503);
      expect(err.message).toContain('Google Places');
    });

    it('inclui o identificador na mensagem para diagnóstico', () => {
      expect(AppException.stationNotFound('st_abc').message).toContain(
        'st_abc',
      );
      expect(AppException.lineNotFound('L9').message).toContain('L9');
    });
  });
});
