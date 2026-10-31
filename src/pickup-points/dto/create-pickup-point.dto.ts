import { IsString, IsUUID, IsNumber, IsInt, IsOptional, Min, Max, MaxLength } from 'class-validator';

export class CreatePickupPointDto {
  @IsUUID()
  missionId: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsInt()
  @IsOptional()
  order?: number;

  @IsInt()
  @IsOptional()
  expectedPassengers?: number;
}
