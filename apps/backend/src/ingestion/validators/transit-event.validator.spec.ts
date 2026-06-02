import { TransitEventValidator } from './transit-event.validator';
import { LineStatus } from '@prisma/client';
import type { NormalizedTransitEvent } from '../dto/normalized-transit-event.dto';
import type { PrismaService } from '../../prisma/prisma.service';

function makeEvent(
  overrides: Partial<NormalizedTransitEvent> = {},
): NormalizedTransitEvent {
  return {
    sourceId: 'src_test',
    lineId: 'L1',
    status: LineStatus.NORMAL,
    delaySeconds: 0,
    observedAt: new Date(),
    ...overrides,
  };
}

function mockPrisma(
  lineIds: string[] = ['L1', 'L2', 'L3', 'L4', 'L4A', 'L5', 'L6'],
) {
  return {
    line: {
      findMany: jest.fn().mockResolvedValue(lineIds.map((id) => ({ id }))),
    },
  } as unknown as PrismaService;
}

describe('TransitEventValidator', () => {
  let validator: TransitEventValidator;

  beforeEach(() => {
    validator = new TransitEventValidator(mockPrisma());
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it('VALIDATOR.1 — evento válido completo é aceito', async () => {
    const result = await validator.validate(makeEvent());
    expect(result.valid).toBe(true);
  });

  // ── Campos obrigatórios ─────────────────────────────────────────────────────

  it('VALIDATOR.2 — lineId vazio é rejeitado', async () => {
    const result = await validator.validate(makeEvent({ lineId: '' }));
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/lineId/);
  });

  it('VALIDATOR.3 — lineId apenas espaços é rejeitado', async () => {
    const result = await validator.validate(makeEvent({ lineId: '   ' }));
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/lineId/);
  });

  it('VALIDATOR.4 — sourceId vazio é rejeitado', async () => {
    const result = await validator.validate(makeEvent({ sourceId: '' }));
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/sourceId/);
  });

  // ── Status ─────────────────────────────────────────────────────────────────

  it('VALIDATOR.5 — status inválido é rejeitado', async () => {
    const result = await validator.validate(
      makeEvent({ status: 'INVALID_STATUS' as LineStatus }),
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/status invalido/);
  });

  // ── Delay ──────────────────────────────────────────────────────────────────

  it('VALIDATOR.6 — delaySeconds negativo é rejeitado', async () => {
    const result = await validator.validate(makeEvent({ delaySeconds: -1 }));
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/negativo/);
  });

  it('VALIDATOR.7 — delaySeconds absurdo (> 86400) é rejeitado', async () => {
    const result = await validator.validate(makeEvent({ delaySeconds: 86401 }));
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/absurdo/);
  });

  // ── Mensagem ────────────────────────────────────────────────────────────────

  it('VALIDATOR.8 — message com 501 caracteres é rejeitada', async () => {
    const result = await validator.validate(
      makeEvent({ message: 'x'.repeat(501) }),
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/message excede/);
  });

  // ── Timestamp ──────────────────────────────────────────────────────────────

  it('VALIDATOR.9 — observedAt inválido (NaN) é rejeitado', async () => {
    const result = await validator.validate(
      makeEvent({ observedAt: new Date('invalid-date') }),
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/observedAt invalido/);
  });

  it('VALIDATOR.10 — evento com mais de 300s de idade é rejeitado', async () => {
    const old = new Date(Date.now() - 301 * 1000);
    const result = await validator.validate(makeEvent({ observedAt: old }));
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/muito antigo/);
  });

  // ── Linha no banco ─────────────────────────────────────────────────────────

  it('VALIDATOR.11 — lineId inexistente no banco é rejeitado', async () => {
    const v = new TransitEventValidator(mockPrisma(['L1', 'L2']));
    const result = await v.validate(makeEvent({ lineId: 'L99' }));
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/nao encontrada/);
  });
});
