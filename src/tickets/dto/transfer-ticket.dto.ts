import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class TransferTicketDto {
  @IsString()
  @Matches(/^\+225[0-9]{10}$/, {
    message: 'Le téléphone doit être au format +225XXXXXXXXXX',
  })
  phone: string;

  @IsUUID()
  @IsOptional()
  pickupPointId?: string;
}
