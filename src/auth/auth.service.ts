import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { OtpService } from './otp.service';
import { RequestOtpDto, VerifyOtpDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async requestOtp(dto: RequestOtpDto): Promise<{ message: string; isNewUser: boolean }> {
    let user = await this.userRepo.findOne({ where: { phone: dto.phone } });
    const isNewUser = !user;

    if (!user) {
      user = this.userRepo.create({
        phone: dto.phone,
        name: dto.name,
        isVerified: false,
      });
      await this.userRepo.save(user);
    }

    const otp = this.otpService.generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    user.otpHash = otpHash;
    user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.userRepo.save(user);

    await this.otpService.sendOtp(dto.phone, otp);

    return { message: 'Code OTP envoyé', isNewUser };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<any> {
    const user = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    if (!user.otpHash || !user.otpExpiresAt) {
      throw new BadRequestException('Aucun OTP en attente');
    }

    if (new Date() > user.otpExpiresAt) {
      throw new BadRequestException('OTP expiré');
    }

    const isValid = await bcrypt.compare(dto.otp, user.otpHash);
    if (!isValid) throw new UnauthorizedException('OTP invalide');

    user.isVerified = true;
    user.otpHash = null;
    user.otpExpiresAt = null;
    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        loyaltyPoints: user.loyaltyPoints,
      },
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<any> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.userRepo.findOne({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException('Utilisateur introuvable');

      return this.generateTokens(user);
    } catch (e) {
      throw new UnauthorizedException('Refresh token invalide');
    }
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, phone: user.phone, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: '30d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
