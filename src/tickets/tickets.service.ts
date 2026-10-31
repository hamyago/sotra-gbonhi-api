import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { QrService } from './qr.service';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    private readonly qrService: QrService,
    private readonly dataSource: DataSource,
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

    return this.dataSource.transaction(async (manager) => {
      const ticket = await manager.findOne(Ticket, {
        where: { id: payload.ticketId },
        relations: ['order', 'order.event', 'ticketCategory'],
        lock: { mode: 'pessimistic_write' },
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

      ticket.status = TicketStatus.USED;
      ticket.usedAt = new Date();
      ticket.scanCount = (ticket.scanCount || 0) + 1;
      await manager.save(ticket);

      const cat = ticket.ticketCategory?.name ?? '';
      const name = ticket.passengerName ?? '';
      const parts = ['Bienvenue', name, '!', ticket.type, cat ? `- ${cat}` : null]
        .filter(Boolean)
        .join(' ');

      return { valid: true, message: parts, ticket };
    });
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
