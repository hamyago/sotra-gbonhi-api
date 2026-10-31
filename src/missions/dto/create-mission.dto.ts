import { IsString, IsUUID, IsDateString, IsOptional, MaxLength } from 'class-validator';

export class CreateMissionDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsUUID()
  busId: string;

  @IsUUID()
  agentId: string;

  @IsUUID()
  eventId: string;

  @IsDateString()
  departureTime: string;
}
