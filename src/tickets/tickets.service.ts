import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { PickupPoint } from '../pickup-points/entities/pickup-point.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { Mission } from '../missions/entities/mission.entity';
import { QrService } from './qr.service';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    @InjectRepository(PickupPoint)
    private readonly pickupPointsRepository: Repository<PickupPoint>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Mission)
    private readonly missionsRepository: Repository<Mission>,
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
      // 1. Lock sur la table tickets uniquement
      const locked = await manager
        .getRepository(Ticket)
        .createQueryBuilder('t')
        .setLock('pessimistic_write')
        .where('t.id = :id', { id: payload.ticketId })
        .getOne();
      if (!locked) return { valid: false, message: 'Ticket introuvable' };

      // 2. Recharger avec relations
      const ticket = await manager.findOneOrFail(Ticket, {
        where: { id: payload.ticketId },
        relations: ['order', 'order.event', 'ticketCategory'],
      });

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

  /// 🆕 Client choisit/chane le point de rassemblement de son ticket
  async setPickupPoint(
    ticketId: string,
    pickupPointId: string,
    userId: string,
  ): Promise<Ticket> {
    const ticket = await this.findOne(ticketId);
    if (ticket.ownerId !== userId) {
      throw new ForbiddenException('Vous ne possédez pas ce ticket');
    }
    if (ticket.status === TicketStatus.USED) {
      throw new BadRequestException('Ticket déjà utilisé');
    }

    const point = await this.pickupPointsRepository.findOne({
      where: { id: pickupPointId },
      relations: ['mission'],
    });
    if (!point) throw new NotFoundException('Point introuvable');

    const order = await this.ordersRepository.findOne({
      where: { id: ticket.orderId },
    });
    if (!order) throw new NotFoundException('Commande introuvable');

    if (point.mission.eventId !== order.eventId) {
      throw new BadRequestException(
        "Ce point n'appartient pas à l'événement du ticket",
      );
    }

    ticket.pickupPointId = pickupPointId;
    return this.ticketsRepository.save(ticket);
  }

  /// 🆕 Tracking ciblé : ticket + point + bus + ETA
  async getTicketTracking(ticketId: string, userId: string) {
    const ticket = await this.ticketsRepository.findOne({
      where: { id: ticketId },
      relations: ['order', 'ticketCategory', 'pickupPoint'],
    });
    if (!ticket) throw new NotFoundException('Ticket introuvable');
    if (ticket.ownerId !== userId) {
      throw new ForbiddenException('Vous ne possédez pas ce ticket');
    }
    if (ticket.status === TicketStatus.USED) {
      return {
        ticket: {
          id: ticket.id,
          status: ticket.status,
          seatNumber: ticket.seatNumber,
        },
        message: 'Ticket déjà utilisé',
        bus: null,
        pickupPoint: null,
      };
    }

    const order = ticket.order;
    const point = ticket.pickupPoint;

    if (!point) {
      return {
        ticket: {
          id: ticket.id,
          status: ticket.status,
          seatNumber: ticket.seatNumber,
        },
        message: 'Aucun point de rassemblement choisi',
        bus: null,
        pickupPoint: null,
      };
    }

    // Trouver la mission du point
    const mission = await this.missionsRepository.findOne({
      where: { id: point.missionId },
      relations: ['bus', 'agent'],
    });

    if (!mission || mission.status !== 'IN_PROGRESS') {
      return {
        ticket: {
          id: ticket.id,
          status: ticket.status,
          seatNumber: ticket.seatNumber,
        },
        message:
          mission?.status === 'SCHEDULED'
            ? 'Le bus n\'est pas encore en route'
            : 'Mission terminée ou annulée',
        bus: null,
        pickupPoint: {
          id: point.id,
          name: point.name,
          latitude: Number(point.latitude),
          longitude: Number(point.longitude),
          order: point.order,
        },
      };
    }

    const hasPosition =
      mission.currentLat != null && mission.currentLng != null;

    let distanceKm: number | null = null;
    let etaMinutes: number | null = null;
    let isStale = true;

    if (hasPosition && mission.lastPositionUpdate) {
      distanceKm = this.haversine(
        Number(mission.currentLat),
        Number(mission.currentLng),
        Number(point.latitude),
        Number(point.longitude),
      );
      // Vitesse moyenne 40 km/h
      etaMinutes = Math.max(1, Math.round((distanceKm / 40) * 60));
      isStale =
        Date.now() - mission.lastPositionUpdate.getTime() > 60_000;
    }

    return {
      ticket: {
        id: ticket.id,
        status: ticket.status,
        seatNumber: ticket.seatNumber,
        passengerName: ticket.passengerName,
      },
      message: 'OK',
      pickupPoint: {
        id: point.id,
        name: point.name,
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        order: point.order,
        estimatedMinutesFromStart: point.estimatedMinutesFromStart,
      },
      mission: {
        id: mission.id,
        name: mission.name,
        status: mission.status,
        departureTime: mission.departureTime,
      },
      bus: mission.bus
        ? {
            id: mission.bus.id,
            plate: mission.bus.plate,
            capacity: mission.bus.capacity,
          }
        : null,
      agent: mission.agent
        ? {
            id: mission.agent.id,
            name: mission.agent.name,
            phone: mission.agent.phone,
            avatarUrl: mission.agent.avatarUrl,
          }
        : null,
      currentPosition: hasPosition
        ? {
            latitude: Number(mission.currentLat),
            longitude: Number(mission.currentLng),
            lastUpdate: mission.lastPositionUpdate,
            isStale,
          }
        : null,
      distanceKm:
        distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
      etaMinutes,
    };
  }

  private haversine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /// 🆕 Client choisit ses sièges (si la catégorie a assignSeats = true)
  async assignSeats(
    orderId: string,
    seats: { ticketId: string; seatNumber: string }[],
    userId: string,
  ): Promise<{ message: string; assigned: number }> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId, userId },
      relations: ['tickets'],
    });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.status !== 'PAID') {
      throw new BadRequestException('La commande doit être payée');
    }

    // Sièges déjà pris sur cet événement (hors de cette commande)
    const ticketIds = order.tickets.map((t) => t.id);
    const takenSeats = new Set(
      (
        await this.ticketsRepository
          .createQueryBuilder('t')
          .leftJoin('t.order', 'o')
          .where('o.eventId = :eventId', { eventId: order.eventId })
          .andWhere('t.seatNumber IS NOT NULL')
          .andWhere('t.id NOT IN (:...ids)', { ids: ticketIds })
          .getMany()
      ).map((t) => t.seatNumber),
    );

    for (const s of seats) {
      if (takenSeats.has(s.seatNumber)) {
        throw new ConflictException(`Le siège ${s.seatNumber} est déjà pris`);
      }
      const ticket = order.tickets.find((t) => t.id === s.ticketId);
      if (!ticket) {
        throw new NotFoundException(`Ticket ${s.ticketId} introuvable`);
      }
      if (ticket.type !== 'TICKET') {
        throw new BadRequestException(
          `Le ticket ${ticket.id} n'est pas un billet (type: ${ticket.type})`,
        );
      }
      ticket.seatNumber = s.seatNumber;
      await this.ticketsRepository.save(ticket);
    }

    return { message: 'Sièges assignés', assigned: seats.length };
  }

  /// 🆕 Client transfère son ticket à un tiers + choisit le point
  async transfer(
    ticketId: string,
    dto: { phone: string; pickupPointId: string },
    currentOwnerId: string,
  ): Promise<Ticket> {
    const ticket = await this.findOne(ticketId);
    if (ticket.ownerId !== currentOwnerId) {
      throw new ForbiddenException('Vous ne possédez pas ce ticket');
    }
    if (ticket.status === TicketStatus.USED) {
      throw new BadRequestException('Impossible de transférer un ticket utilisé');
    }

    // Vérifier le destinataire
    const newOwner = await this.usersRepository.findOne({
      where: { phone: dto.phone },
    });
    if (!newOwner) {
      throw new NotFoundException(
        'Destinataire introuvable. Il doit avoir un compte SOTRA GBONHI.',
      );
    }
    if (newOwner.id === currentOwnerId) {
      throw new BadRequestException('Vous ne pouvez pas vous transférer le ticket');
    }

    // Vérifier le point
    const point = await this.pickupPointsRepository.findOne({
      where: { id: dto.pickupPointId },
      relations: ['mission'],
    });
    if (!point) throw new NotFoundException('Point introuvable');

    const order = await this.ordersRepository.findOne({
      where: { id: ticket.orderId },
    });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (point.mission.eventId !== order.eventId) {
      throw new BadRequestException(
        "Ce point n'appartient pas à l'événement du ticket",
      );
    }

    ticket.ownerId = newOwner.id;
    ticket.pickupPointId = dto.pickupPointId;
    ticket.sharedVia = 'TRANSFER';
    ticket.sharedAt = new Date();
    return this.ticketsRepository.save(ticket);
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
