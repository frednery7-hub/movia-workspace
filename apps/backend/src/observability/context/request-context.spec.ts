import {
  getCorrelationId,
  getRequestContext,
  runWithRequestContext,
} from './request-context';

describe('RequestContext', () => {
  it('fora de uma requisição, não há contexto', () => {
    expect(getRequestContext()).toBeUndefined();
    expect(getCorrelationId()).toBeUndefined();
  });

  it('dentro do contexto, expõe o correlationId', () => {
    runWithRequestContext({ correlationId: 'abc123' }, () => {
      expect(getCorrelationId()).toBe('abc123');
      expect(getRequestContext()).toEqual({ correlationId: 'abc123' });
    });
  });

  it('propaga através de código assíncrono (o ponto principal)', async () => {
    await runWithRequestContext(
      { correlationId: 'async-id', method: 'GET', route: '/eta/:id' },
      async () => {
        // Simula a cadeia real: controller -> service -> repository,
        // cada um com await no meio. O contexto tem que sobreviver.
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 5));

        const deepInTheCallStack = async () => {
          await Promise.resolve();
          return getCorrelationId();
        };

        await expect(deepInTheCallStack()).resolves.toBe('async-id');
        expect(getRequestContext()?.route).toBe('/eta/:id');
      },
    );
  });

  it('contextos concorrentes não vazam entre si', async () => {
    const results: string[] = [];

    await Promise.all([
      runWithRequestContext({ correlationId: 'req-1' }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(getCorrelationId()!);
      }),
      runWithRequestContext({ correlationId: 'req-2' }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        results.push(getCorrelationId()!);
      }),
    ]);

    // Cada requisição enxerga apenas o próprio id, mesmo intercaladas.
    expect(results.sort()).toEqual(['req-1', 'req-2']);
  });

  it('após sair do contexto, volta a não haver contexto', () => {
    runWithRequestContext({ correlationId: 'temp' }, () => {
      expect(getCorrelationId()).toBe('temp');
    });
    expect(getCorrelationId()).toBeUndefined();
  });
});
