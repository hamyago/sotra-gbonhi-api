import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsNumber()
  @Min(0)
  totalSeats: number;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
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

  @IsString()
  category: string;

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

  @IsString()
  @IsOptional()
  status?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTicketCategoryDto)
  ticketCategories: CreateTicketCategoryDto[];
}
