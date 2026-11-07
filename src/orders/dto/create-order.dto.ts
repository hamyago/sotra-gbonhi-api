import {
  IsString,
  IsInt,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentProvider } from '../entities/order.entity';

export class OrderItemDto {
  @IsString()
  ticketCategoryId: string;

  @IsInt()
  @Min(1)
  @Max(10)
  quantity: number;
}

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

  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  customerLat?: number;

  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  customerLng?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsInt()
  @Min(0)
  @Max(10)
  transportQuantity: number;

  @IsInt()
  @Min(0)
  @Max(10)
  parkingQuantity: number;

  @IsEnum(PaymentProvider)
  paymentProvider: PaymentProvider;

  @IsString()
  @IsOptional()
  pickupPointId?: string;
}
