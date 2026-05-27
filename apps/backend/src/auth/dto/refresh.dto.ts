import { IsString, IsNotEmpty, Length } from 'class-validator';

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  @Length(128, 128)
  refresh_token!: string;
}
