import { IsString, IsOptional, IsEnum, Matches, MaxLength } from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class CreateUserDto {
  @IsString()
  @Matches(/^\+225[0-9]{10}$/, { message: 'Format +225XXXXXXXXXX' })
  phone: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsEnum(UserRole)
  role: UserRole;
}
