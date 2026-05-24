import { IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class UpdateLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence!: number;

  @IsBoolean()
  isStationary!: boolean;

  @IsBoolean()
  isDegraded!: boolean;

  @IsNumber()
  @IsOptional()
  lineId?: number;
}
