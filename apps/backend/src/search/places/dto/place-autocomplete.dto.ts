import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class PlaceAutocompleteQueryDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(/^[\p{L}\p{N}\s.,#º°'/-]+$/u, {
    message: 'q contem caracteres nao permitidos.',
  })
  q!: string;

  @Transform(({ value }) => {
    const token = String(value ?? '').trim();
    return token.length > 0 ? token : undefined;
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  sessionToken?: string;
}
