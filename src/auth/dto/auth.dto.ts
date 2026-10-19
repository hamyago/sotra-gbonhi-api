import { IsString, IsNotEmpty, Length, Matches, IsOptional } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @Matches(/^\+225[0-9]{10}$/, { message: 'Le téléphone doit être au format +225XXXXXXXXXX' })
  phone: string;

  @IsString()
  @IsOptional()
  name?: string;
}

export class VerifyOtpDto {
  @IsString()
  @Matches(/^\+225[0-9]{10}$/)
  phone: string;

  @IsString()
  @Length(6, 6, { message: 'Le code OTP doit contenir 6 chiffres' })
  otp: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
