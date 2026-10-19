import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class QrService {
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    this.secret = this.configService.get<string>('QR_SECRET') || 'fallback-qr-secret';
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
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(`${ticketId}.${timestamp}`)
      .digest('hex')
      .substring(0, 16);

    if (signature !== expectedSignature) return null;

    return { ticketId, timestamp };
  }
}
