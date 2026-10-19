import { IsString, IsEnum, IsDateString, IsNumber, IsOptional, Min } from 'class-validator';
import { EventCategory, EventStatus } from '../entities/event.entity';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(EventCategory)
  category: EventCategory;

  @IsDateString()
  date: string;

  @IsString()
  venue: string;

  @IsString()
  @IsOptional()
  venueAddress?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsNumber()
  @Min(0)
  startingPrice: number;

  @IsNumber()
  @Min(1)
  totalSeats: number;

  @IsNumber()
  @Min(0)
  transportPrice: number;

  @IsNumber()
  @Min(0)
  parkingPrice: number;

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;
}
