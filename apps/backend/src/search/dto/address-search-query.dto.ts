import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class AddressSearchQueryDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  @Matches(/^[\p{L}\p{N}\s.,#º°'/-]+$/u, {
    message: 'q contem caracteres nao permitidos.',
  })
  q!: string;
}
