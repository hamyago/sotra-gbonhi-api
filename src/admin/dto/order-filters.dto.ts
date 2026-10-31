import { IsOptional, IsUUID, IsEnum, IsDateString } from 'class-validator';
import { OrderStatus } from '../../orders/entities/order.entity';

export class OrderFiltersDto {
  @IsUUID()
  @IsOptional()
  eventId?: string;

  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsDateString()
  @IsOptional()
  from?: string;

  @IsDateString()
  @IsOptional()
  to?: string;
}
