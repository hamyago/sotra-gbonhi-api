import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly isDev: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isDev = this.configService.get('NODE_ENV') !== 'production';
  }

  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOtp(phone: string, otp: string): Promise<void> {
    if (this.isDev) {
      this.logger.log(`📱 [DEV] OTP pour ${phone} : ${otp}`);
      return;
    }

    // TODO: Intégrer Orange SMS API ou Twilio
    this.logger.log(`📱 OTP envoyé à ${phone}`);
  }
}
