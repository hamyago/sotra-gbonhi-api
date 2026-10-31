import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class QrService {
  private readonly secret: string;
  private readonly maxAgeMs: number;

  constructor(private readonly configService: ConfigService) {
    const secret = this.configService.get<string>('QR_SECRET');
    if (!secret) {
      throw new Error('QR_SECRET is not defined in environment variables');
    }
    this.secret = secret;
    const days = parseInt(this.configService.get<string>('QR_MAX_AGE_DAYS') ?? '30', 10);
    this.maxAgeMs = days * 24 * 60 * 60 * 1000;
  }

  generateTicketQr(ticketId: string): string {
    const timestamp = Date.now();
    const payload = `${ticketId}.${timestamp}`;
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex')
      .substring(0, 16);
    return `TKT.${payload}.${signature}`;
  }

  verifyTicketQr(token: string): { ticketId: string; timestamp: number } | null {
    const parts = token.split('.');
    if (parts.length !== 4 || parts[0] !== 'TKT') return null;

    const [, ticketId, timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return null;

    if (Date.now() - timestamp > this.maxAgeMs) return null;

    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(`${ticketId}.${timestamp}`)
      .digest('hex')
      .substring(0, 16);

    const a = Buffer.from(signature, 'utf8');
    const b = Buffer.from(expectedSignature, 'utf8');
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;

    return { ticketId, timestamp };
  }
}
