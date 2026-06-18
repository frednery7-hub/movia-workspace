import { Transform } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { normalizeOriginLineIds } from '../line-id.util';

export class AddressSearchQueryDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  @Matches(/^[\p{L}\p{N}\s.,#º°'/-]+$/u, {
    message: 'q contem caracteres nao permitidos.',
  })
  q!: string;

  @Transform(({ value }) => normalizeOriginLineIds(value))
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  originLineIds?: string[];
}
