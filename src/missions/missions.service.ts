import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mission, MissionStatus } from './entities/mission.entity';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Bus } from '../buses/entities/bus.entity';
import { PickupPoint } from '../pickup-points/entities/pickup-point.entity';
import { Event } from '../events/entities/event.entity';
import {
  Ticket,
  TicketType,
  TicketStatus,
} from '../tickets/entities/ticket.entity';

export interface MissionFilters {
  eventId?: string;
  status?: MissionStatus;
}

@Injectable()
export class MissionsService {
  constructor(
    @InjectRepository(Mission)
    private readonly missionsRepository: Repository<Mission>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Bus)
    private readonly busesRepository: Repository<Bus>,
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    @InjectRepository(PickupPoint)
    private readonly pickupPointsRepository: Repository<PickupPoint>,
  ) {}

  async create(dto: CreateMissionDto): Promise<Mission> {
    const agent = await this.usersRepository.findOne({ where: { id: dto.agentId } });
    if (!agent) throw new NotFoundException('Agent introuvable');
    if (agent.role !== UserRole.AGENT) {
      throw new BadRequestException("L'utilisateur doit avoir le rôle AGENT");
    }

    const bus = await this.busesRepository.findOne({ where: { id: dto.busId } });
    if (!bus) throw new NotFoundException('Bus introuvable');

    const event = await this.eventsRepository.findOne({ where: { id: dto.eventId } });
    if (!event) throw new NotFoundException('Événement introuvable');

    const mission = this.missionsRepository.create({
      name: dto.name,
      busId: dto.busId,
      agentId: dto.agentId,
      eventId: dto.eventId,
      departureTime: new Date(dto.departureTime),
      status: MissionStatus.SCHEDULED,
    });
    return this.missionsRepository.save(mission);
  }

  async findAll(filters?: MissionFilters): Promise<Mission[]> {
    const qb = this.missionsRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.bus', 'bus')
      .leftJoinAndSelect('m.agent', 'agent')
      .leftJoinAndSelect('m.event', 'event')
      .orderBy('m.departureTime', 'ASC');

    if (filters?.eventId) {
      qb.andWhere('m.eventId = :eventId', { eventId: filters.eventId });
    }
    if (filters?.status) {
      qb.andWhere('m.status = :status', { status: filters.status });
    }
    return qb.getMany();
  }

  async findOne(id: string): Promise<Mission> {
    const mission = await this.missionsRepository.findOne({ where: { id } });
    if (!mission) throw new NotFoundException('Mission introuvable');
    return mission;
  }

  async findByAgent(agentId: string): Promise<Mission[]> {
    return this.missionsRepository.find({
      where: { agentId },
      order: { departureTime: 'ASC' },
    });
  }

  async findByEvent(eventId: string): Promise<Mission[]> {
    return this.missionsRepository.find({
      where: { eventId },
      order: { departureTime: 'ASC' },
    });
  }

  async update(id: string, dto: UpdateMissionDto): Promise<Mission> {
    const mission = await this.findOne(id);
    if (dto.busId) mission.busId = dto.busId;
    if (dto.agentId) mission.agentId = dto.agentId;
    if (dto.eventId) mission.eventId = dto.eventId;
    if (dto.name) mission.name = dto.name;
    if (dto.departureTime) mission.departureTime = new Date(dto.departureTime);
    return this.missionsRepository.save(mission);
  }

  async start(id: string): Promise<Mission> {
    const result = await this.missionsRepository
      .createQueryBuilder()
      .update(Mission)
      .set({ status: MissionStatus.IN_PROGRESS })
      .where('id = :id AND status = :status', {
        id,
        status: MissionStatus.SCHEDULED,
      })
      .execute();
    if (result.affected === 0) {
      throw new BadRequestException("La mission n'est pas en attente");
    }
    return this.findOne(id);
  }

  async complete(id: string): Promise<Mission> {
    const result = await this.missionsRepository
      .createQueryBuilder()
      .update(Mission)
      .set({ status: MissionStatus.COMPLETED })
      .where('id = :id AND status != :status', {
        id,
        status: MissionStatus.COMPLETED,
      })
      .execute();
    if (result.affected === 0) {
      throw new BadRequestException('Mission déjà terminée ou introuvable');
    }
    return this.findOne(id);
  }

  async reset(id: string): Promise<Mission> {
    await this.missionsRepository.update(id, {
      status: MissionStatus.SCHEDULED,
      currentLat: null,
      currentLng: null,
      lastPositionUpdate: null,
    });
    return this.findOne(id);
  }

  async updatePosition(
    id: string,
    latitude: number,
    longitude: number,
  ): Promise<Mission> {
    const result = await this.missionsRepository
      .createQueryBuilder()
      .update(Mission)
      .set({
        currentLat: latitude,
        currentLng: longitude,
        lastPositionUpdate: new Date(),
      })
      .where('id = :id AND status = :status', {
        id,
        status: MissionStatus.IN_PROGRESS,
      })
      .execute();
    if (result.affected === 0) {
      throw new BadRequestException(
        'La mission doit être en cours pour envoyer la position',
      );
    }
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ message: string }> {
    const mission = await this.findOne(id);
    await this.missionsRepository.remove(mission);
    return { message: 'Mission supprimée' };
  }

  async getPassengersByPickup(missionId: string) {
    const mission = await this.findOne(missionId);

    const points = await this.pickupPointsRepository.find({
      where: { missionId },
      order: { order: 'ASC' },
    });

    const result = [];
    for (const point of points) {
      const tickets = await this.ticketsRepository.find({
        where: { pickupPointId: point.id },
        relations: ['order', 'ticketCategory'],
        order: { seatNumber: 'ASC' },
      });

      // Filtrer uniquement les billets TICKET (pas transport/parking)
      const ticketOnly = tickets.filter((t) => t.type === TicketType.TICKET);

      result.push({
        point: {
          id: point.id,
          name: point.name,
          latitude: Number(point.latitude),
          longitude: Number(point.longitude),
          order: point.order,
          expectedPassengers: point.expectedPassengers,
        },
        stats: {
          total: ticketOnly.length,
          scanned: ticketOnly.filter((t) => t.status === TicketStatus.USED)
            .length,
          pending: ticketOnly.filter((t) => t.status === TicketStatus.VALID)
            .length,
        },
        passengers: ticketOnly.map((t) => ({
          ticketId: t.id,
          passengerName: t.passengerName ?? 'Passager',
          passengerPhone: t.passengerPhone ?? '',
          seatNumber: t.seatNumber,
          categoryName: t.ticketCategory?.name ?? 'Standard',
          categoryColor: t.ticketCategory?.color ?? '#009E49',
          status: t.status,
          scannedAt: t.usedAt,
        })),
      });
    }
    return result;
  }

  async getMissionPassengers(missionId: string) {
    const mission = await this.findOne(missionId);

    const bus = await this.busesRepository.findOne({
      where: { id: mission.busId },
    });

    const tickets = await this.ticketsRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.order', 'order')
      .leftJoinAndSelect('ticket.ticketCategory', 'category')
      .where('order.eventId = :eventId', { eventId: mission.eventId })
      .andWhere('ticket.type IN (:...types)', {
        types: [TicketType.TICKET, TicketType.TRANSPORT],
      })
      .andWhere('order.status = :status', { status: 'PAID' })
      .orderBy('category.sortOrder', 'ASC')
      .addOrderBy('ticket.passengerName', 'ASC')
      .getMany();

    const passengers = tickets.map((t) => ({
      ticketId: t.id,
      type: t.type,
      passengerName: t.passengerName ?? 'Passager inconnu',
      passengerPhone: t.passengerPhone ?? '',
      categoryName: t.ticketCategory?.name ?? 'Standard',
      categoryColor: t.ticketCategory?.color ?? '#009E49',
      status: t.status,
      scannedAt: t.usedAt,
    }));

    const scanned = passengers.filter(
      (p) => p.status === TicketStatus.USED,
    ).length;
    const pending = passengers.filter(
      (p) => p.status === TicketStatus.VALID,
    ).length;

    return {
      missionId: mission.id,
      missionName: mission.name,
      eventId: mission.eventId,
      busInfo: bus ? { plate: bus.plate, capacity: bus.capacity } : null,
      stats: {
        totalTickets: passengers.length,
        scanned,
        pending,
      },
      passengers,
    };
  }
}
