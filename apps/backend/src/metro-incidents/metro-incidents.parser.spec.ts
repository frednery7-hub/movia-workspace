import { MetroIncidentsParser } from './metro-incidents.parser';

describe('MetroIncidentsParser', () => {
  const parser = new MetroIncidentsParser();
  const now = new Date('2026-06-10T16:00:00.000Z');

  it('retorna todas as linhas e classifica ocorrencia por texto', () => {
    const incidents = parser.parse(
      `
        <section>
          <div>L1 Servicio normal</div>
          <div>L2 Servicio normal</div>
          <div>L3 Servicio normal</div>
          <div>L4 Retraso en frecuencia habitual L4 solo disponible entre Tobalaba y Vicente Valdés</div>
          <div>L4A Servicio normal</div>
          <div>L5 Servicio normal</div>
          <div>L6 Servicio normal</div>
        </section>
      `,
      now,
    );

    expect(incidents).toHaveLength(7);
    expect(
      incidents.find((incident) => incident.lineId === 'L4'),
    ).toMatchObject({
      lineId: 'L4',
      status: 'delay',
      source: 'official-metro',
      scrapedAt: now.toISOString(),
    });
  });

  it('nao omite linha quando nao consegue parsear contexto', () => {
    const incidents = parser.parse('<div>L1 Servicio normal</div>', now);

    expect(incidents).toHaveLength(7);
    expect(
      incidents.find((incident) => incident.lineId === 'L6'),
    ).toMatchObject({
      lineId: 'L6',
      status: 'unknown',
      title: 'No fue posible verificar el estado',
    });
  });
});
