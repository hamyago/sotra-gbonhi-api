import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
  Matches,
  IsEnum,
  IsInt,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventCategory, EventStatus } from '../entities/event.entity';

export class CreateTicketCategoryDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsInt()
  @Min(0)
  @Max(100000)
  totalSeats: number;

  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'La couleur doit être au format hexadécimal #RRGGBB',
  })
  @IsOptional()
  color?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class CreateEventDto {
  @IsString()
  @MaxLength(150)
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

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsNumber()
  @Min(0)
  transportPrice: number;

  @IsNumber()
  @Min(0)
  parkingPrice: number;

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTicketCategoryDto)
  ticketCategories: CreateTicketCategoryDto[];
}
