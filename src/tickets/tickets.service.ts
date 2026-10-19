import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { QrService } from './qr.service';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    private readonly qrService: QrService,
  ) {}

  async findByUserId(userId: string): Promise<Ticket[]> {
    return this.ticketRepo.find({
      where: { ownerId: userId },
      order: { createdAt: 'DESC' },
      relations: ['order'],
    });
  }

  async findOne(id: string): Promise<Ticket> {
    const ticket = await this.ticketRepo.findOne({
      where: { id },
      relations: ['order', 'owner'],
    });
    if (!ticket) throw new NotFoundException('Ticket introuvable');
    return ticket;
  }

  async verifyQr(token: string): Promise<{ valid: boolean; ticket?: Ticket; reason?: string }> {
    const payload = this.qrService.verifyTicketQr(token);
    if (!payload) return { valid: false, reason: 'QR invalide' };

    const ticket = await this.ticketRepo.findOne({
      where: { id: payload.ticketId },
      relations: ['order'],
    });
    if (!ticket) return { valid: false, reason: 'Ticket introuvable' };

    if (ticket.status === TicketStatus.USED) {
      return { valid: false, ticket, reason: 'Billet déjà utilisé' };
    }

    if (ticket.status === TicketStatus.CANCELLED) {
      return { valid: false, ticket, reason: 'Billet annulé' };
    }

    if (ticket.order.status !== 'PAID') {
      return { valid: false, ticket, reason: 'Commande non payée' };
    }

    return { valid: true, ticket };
  }

  async markAsUsed(ticketId: string, agentId: string): Promise<Ticket> {
    const ticket = await this.findOne(ticketId);
    if (ticket.status === TicketStatus.USED) {
      throw new BadRequestException('Billet déjà utilisé');
    }
    ticket.status = TicketStatus.USED;
    ticket.usedAt = new Date();
    ticket.usedBy = agentId;
    ticket.scanCount = (ticket.scanCount || 0) + 1;
    return this.ticketRepo.save(ticket);
  }

  async shareByPhone(ticketId: string, userId: string, phone: string): Promise<Ticket> {
    const ticket = await this.findOne(ticketId);
    if (ticket.ownerId !== userId) {
      throw new BadRequestException('Vous ne possédez pas ce ticket');
    }
    ticket.passengerPhone = phone;
    ticket.sharedVia = 'SMS';
    ticket.sharedAt = new Date();
    return this.ticketRepo.save(ticket);
  }
}
