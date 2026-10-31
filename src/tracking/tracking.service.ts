import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Mission } from '../missions/entities/mission.entity';
import { PickupPoint } from '../pickup-points/entities/pickup-point.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Mission)
    private readonly missionsRepository: Repository<Mission>,
    @InjectRepository(PickupPoint)
    private readonly pickupPointsRepository: Repository<PickupPoint>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
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
    });

    const missionsWithPoints = await Promise.all(
      missions.map(async (mission) => {
        const points = await this.pickupPointsRepository.find({
          where: { missionId: mission.id },
          order: { order: 'ASC' },
        });

        // Charger l'agent complet
        let agentInfo = null;
        if (mission.agentId) {
          const agent = await this.usersRepository.findOne({
            where: { id: mission.agentId },
          });
          if (agent) {
            agentInfo = {
              id: agent.id,
              name: agent.name,
              phone: agent.phone,
              matricule: agent.matricule,
              avatarUrl: agent.avatarUrl,
            };
          }
        }

        return {
          id: mission.id,
          name: mission.name,
          status: mission.status,
          departureTime: mission.departureTime,
          bus: mission.bus
            ? { plate: mission.bus.plate, capacity: mission.bus.capacity }
            : null,
          agent: agentInfo,
          currentPosition:
            mission.currentLat != null && mission.currentLng != null
              ? {
                  latitude: Number(mission.currentLat),
                  longitude: Number(mission.currentLng),
                  lastUpdate: mission.lastPositionUpdate,
                }
              : null,
          pickupPoints: points.map((p) => ({
            id: p.id,
            name: p.name,
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
            order: p.order,
            expectedPassengers: p.expectedPassengers,
          })),
        };
      }),
    );

    return { eventId, missions: missionsWithPoints };
  }
}
