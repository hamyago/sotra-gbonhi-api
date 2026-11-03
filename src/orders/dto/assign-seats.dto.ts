import {
  ArrayMinSize,
  IsArray,
  IsString,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SeatAssignmentDto {
  @IsUUID()
  ticketId: string;

  @IsString()
  @Matches(/^[A-Z0-9-]{1,10}$/, {
    message: 'Le siège doit être au format A1, B12, etc.',
  })
  seatNumber: string;
}

export class AssignSeatsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SeatAssignmentDto)
  seats: SeatAssignmentDto[];
}
