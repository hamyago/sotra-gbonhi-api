import { IsString, IsInt, IsBoolean, IsOptional, IsEnum, Min, Max, IsPhoneNumber } from 'class-validator';
import { PaymentProvider } from '../entities/order.entity';

export class CreateOrderDto {
  @IsString()
  eventId: string;

  @IsString()
  customerName: string;

  @IsString()
  customerPhone: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;

  @IsInt()
  @Min(1)
  @Max(10)
  ticketQuantity: number;

  @IsBoolean()
  hasTransport: boolean;

  @IsBoolean()
  hasParking: boolean;

  @IsEnum(PaymentProvider)
  paymentProvider: PaymentProvider;
}
