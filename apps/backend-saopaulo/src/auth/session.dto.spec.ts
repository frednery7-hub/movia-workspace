import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateSessionDto } from './dto/session.dto';

async function validateDto(plain: object) {
  const dto = plainToInstance(CreateSessionDto, plain);
  return validate(dto);
}

describe('CreateSessionDto', () => {
  it('aceita UUID v4 valido', async () => {
    const errors = await validateDto({
      deviceId: '550e8400-e29b-41d4-a716-446655440000',
      language: 'es-CL',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejeita deviceId vazio', async () => {
    const errors = await validateDto({ deviceId: '' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejeita deviceId que nao e UUID v4', async () => {
    const errors = await validateDto({ deviceId: 'nao-e-uuid' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejeita deviceId com tamanho errado', async () => {
    const errors = await validateDto({ deviceId: '123' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('aceita sem language — campo opcional', async () => {
    const errors = await validateDto({
      deviceId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejeita language muito longa', async () => {
    const errors = await validateDto({
      deviceId: '550e8400-e29b-41d4-a716-446655440000',
      language: 'es-CL-MUITO-LONGO-DEMAIS',
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});
