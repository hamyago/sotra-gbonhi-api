import { IsString, IsInt, IsOptional, IsBoolean, Min, MaxLength } from 'class-validator';

export class CreateBusDto {
  @IsString()
  @MaxLength(20)
  plate: string;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
