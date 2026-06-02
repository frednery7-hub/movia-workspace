import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LineStatus } from '@prisma/client';

export class UpdateNetworkStateDto {
  @IsEnum(LineStatus)
  status!: LineStatus;

  @IsInt()
  @Min(0)
  @Max(86400)
  delaySeconds!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
