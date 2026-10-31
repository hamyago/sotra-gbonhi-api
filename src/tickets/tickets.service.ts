import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { QrService } from './qr.service';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    private readonly qrService: QrService,
  ) {}

  async findByUser(userId: string): Promise<Ticket[]> {
    return this.ticketsRepository.find({
      where: { ownerId: userId },
      relations: ['order', 'order.event', 'ticketCategory'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({
      where: { id },
      relations: ['order', 'order.event', 'ticketCategory'],
    });
    if (!ticket) throw new NotFoundException('Ticket introuvable');
    return ticket;
  }

  async verify(qrData: string): Promise<{
    valid: boolean;
    message: string;
    ticket?: Ticket;
  }> {
    const payload = this.qrService.verifyTicketQr(qrData);
    if (!payload) {
      return { valid: false, message: 'QR code falsifié ou invalide' };
    }

    const ticket = await this.ticketsRepository.findOne({
      where: { id: payload.ticketId },
      relations: ['order', 'order.event', 'ticketCategory'],
    });
    if (!ticket) return { valid: false, message: 'Ticket introuvable' };

    if (ticket.order.status !== 'PAID') {
      return { valid: false, message: 'Commande non payée', ticket };
    }

    if (ticket.status === TicketStatus.USED) {
      return { valid: false, message: 'Ticket déjà utilisé', ticket };
    }

    if (ticket.status === TicketStatus.CANCELLED) {
      return { valid: false, message: 'Ticket annulé', ticket };
    }

    await this.ticketsRepository.update(ticket.id, {
      status: TicketStatus.USED,
      usedAt: new Date(),
      scanCount: (ticket.scanCount || 0) + 1,
    });

    const updated = await this.findOne(ticket.id);
    const cat = updated.ticketCategory?.name ?? '';
    return {
      valid: true,
      message: `Bienvenue ! ${updated.type}${cat ? ' - ' + cat : ''}`,
      ticket: updated,
    };
  }

  async share(id: string, userId: string): Promise<Ticket> {
    const ticket = await this.findOne(id);
    if (ticket.ownerId !== userId) {
      throw new BadRequestException('Vous ne possédez pas ce ticket');
    }
    await this.ticketsRepository.update(id, { sharedAt: new Date() });
    return this.findOne(id);
  }
}
