import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class QrCodeService {
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    this.secret = this.configService.get<string>('JWT_SECRET') || 'fallback-secret';
  }

  /**
   * Génère un token signé HMAC-SHA256 pour un ordre
   * Format: ORDER_ID.TIMESTAMP.SIGNATURE
   */
  generateSignedToken(orderId: string): string {
    const timestamp = Date.now();
    const payload = `${orderId}.${timestamp}`;
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex')
      .substring(0, 16);
    return `${payload}.${signature}`;
  }

  /**
   * Vérifie la signature d'un token
   */
  verifyToken(token: string): { orderId: string; timestamp: number } | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [orderId, timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(`${orderId}.${timestamp}`)
      .digest('hex')
      .substring(0, 16);

    if (signature !== expectedSignature) return null;

    return { orderId, timestamp };
  }
}
