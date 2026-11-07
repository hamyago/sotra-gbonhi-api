import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  /// 🆕 Statistiques de participation
  async getStats(userId: string) {
    // Récupérer toutes les commandes payées du user
    const orders = await this.ordersRepository.find({
      where: { userId, status: OrderStatus.PAID },
      relations: ['event'],
    });

    const eventsByCategory: Record<string, number> = {};
    const eventIds = new Set<string>();

    for (const order of orders) {
      if (!order.event) continue;
      eventIds.add(order.event.id);
      const category = order.event.category;
      eventsByCategory[category] = (eventsByCategory[category] ?? 0) + 1;
    }

    // Compter les tickets (tous types)
    const tickets = await this.ticketsRepository.find({
      where: { ownerId: userId },
    });

    const usedTickets = tickets.filter((t) => t.status === 'USED').length;
    const validTickets = tickets.filter((t) => t.status === 'VALID').length;

    return {
      totalEvents: eventIds.size,
      totalOrders: orders.length,
      totalTickets: tickets.length,
      usedTickets,
      validTickets,
      eventsByCategory,
    };
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findById(id);
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    return this.usersRepository.save(user);
  }
}
