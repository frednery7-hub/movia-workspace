import { Transform } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { normalizeOriginLineIds } from '../../line-id.util';

export class PlaceDetailsQueryDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @MinLength(1)
  @MaxLength(220)
  placeId!: string;

  @Transform(({ value }) => {
    const token = String(value ?? '').trim();
    return token.length > 0 ? token : undefined;
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  sessionToken?: string;

  @Transform(({ value }) => normalizeOriginLineIds(value))
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  originLineIds?: string[];
}
