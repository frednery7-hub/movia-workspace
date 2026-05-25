import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @IsString()
  @IsOptional()
  language?: string;
}
