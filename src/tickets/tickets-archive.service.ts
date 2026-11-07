import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { Order } from '../orders/entities/order.entity';
import { Event } from '../events/entities/event.entity';

@Injectable()
export class TicketsArchiveService {
  private readonly logger = new Logger(TicketsArchiveService.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
  ) {}

  /// 🆕 Archivage automatique : tous les jours à 3h
  /// Supprime les tickets dont l'événement est terminé depuis > 3 jours
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async archiveOldTickets() {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Trouver les événements terminés depuis > 3 jours
    const oldEvents = await this.eventsRepository
      .createQueryBuilder('event')
      .where('event.date < :date', { date: threeDaysAgo })
      .getMany();

    if (oldEvents.length === 0) {
      this.logger.log('Aucun événement à archiver');
      return;
    }

    const eventIds = oldEvents.map((e) => e.id);

    // Supprimer les tickets liés à ces événements (via orders)
    const result = await this.ticketsRepository
      .createQueryBuilder()
      .delete()
      .from(Ticket)
      .where(
        `"orderId" IN (SELECT id FROM orders WHERE "eventId" IN (:...eventIds))`,
        { eventIds },
      )
      .execute();

    this.logger.log(
      `Archivage : ${result.affected} tickets supprimés (${oldEvents.length} événements)`,
    );
  }
}
