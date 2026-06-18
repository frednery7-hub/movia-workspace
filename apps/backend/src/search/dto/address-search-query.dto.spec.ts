import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AddressSearchQueryDto } from './address-search-query.dto';

async function errorsFor(q: string) {
  const dto = plainToInstance(AddressSearchQueryDto, { q });
  return validate(dto);
}

describe('AddressSearchQueryDto', () => {
  it('aceita query válida com trim', async () => {
    const dto = plainToInstance(AddressSearchQueryDto, {
      q: '  Av. Providencia 1200  ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.q).toBe('Av. Providencia 1200');
  });

  it('rejeita query menor que 3 caracteres', async () => {
    await expect(errorsFor('ab')).resolves.not.toHaveLength(0);
  });

  it('rejeita query maior que 120 caracteres', async () => {
    await expect(errorsFor('a'.repeat(121))).resolves.not.toHaveLength(0);
  });

  it('rejeita caracteres obviamente abusivos', async () => {
    await expect(
      errorsFor('<script>alert(1)</script>'),
    ).resolves.not.toHaveLength(0);
  });
});
