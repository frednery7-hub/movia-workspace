import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Length,
  Matches,
} from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  @Matches(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    {
      message: 'deviceId deve ser um UUID v4 valido',
    },
  )
  deviceId!: string;

  @IsString()
  @IsOptional()
  @Length(2, 10)
  language?: string;
}
