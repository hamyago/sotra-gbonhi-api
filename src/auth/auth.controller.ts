import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RequestOtpDto, VerifyOtpDto, RefreshTokenDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Limite : 3 demandes d'OTP par minute
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('register')
  async register(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('login')
  async login(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto);
  }

  // Limite : 5 tentatives de vérification par minute
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: any) {
    return this.authService.getProfile(req.user.id);
  }
}
