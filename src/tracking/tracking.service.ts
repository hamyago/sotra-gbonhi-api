import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Mission } from '../missions/entities/mission.entity';

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Mission)
    private readonly missionsRepository: Repository<Mission>,
  ) {}

  async userHasPaidTicket(userId: string, eventId: string): Promise<boolean> {
    const order = await this.ordersRepository.findOne({
      where: { userId, eventId, status: OrderStatus.PAID },
    });
    return !!order;
  }

  async getTrackingForEvent(eventId: string) {
    const missions = await this.missionsRepository.find({
      where: { eventId },
      order: { departureTime: 'ASC' },
      relations: ['pickupPoints'],
    });

    const now = Date.now();
    return {
      eventId,
      missions: missions.map((m) => ({
        id: m.id,
        name: m.name,
        status: m.status,
        departureTime: m.departureTime,
        bus: m.bus
          ? { plate: m.bus.plate, capacity: m.bus.capacity }
          : null,
        agent: m.agent
          ? {
              id: m.agent.id,
              name: m.agent.name,
              phone: m.agent.phone,
              matricule: m.agent.matricule,
              avatarUrl: m.agent.avatarUrl,
            }
          : null,
        currentPosition:
          m.currentLat != null && m.currentLng != null
            ? {
                latitude: Number(m.currentLat),
                longitude: Number(m.currentLng),
                lastUpdate: m.lastPositionUpdate,
                isStale: m.lastPositionUpdate
                  ? now - m.lastPositionUpdate.getTime() > 60_000
                  : true,
              }
            : null,
        pickupPoints: m.pickupPoints.map((p) => ({
          id: p.id,
          name: p.name,
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
          order: p.order,
          expectedPassengers: p.expectedPassengers,
        })),
      })),
    };
  }
}
