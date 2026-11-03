import { IsUUID } from 'class-validator';

export class SetPickupPointDto {
  @IsUUID()
  pickupPointId: string;
}
