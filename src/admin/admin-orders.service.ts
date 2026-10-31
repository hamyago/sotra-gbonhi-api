import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrderFiltersDto } from './dto/order-filters.dto';

@Injectable()
export class AdminOrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {}

  async findAll(filters: OrderFiltersDto): Promise<Order[]> {
    const qb = this.ordersRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.tickets', 'tickets')
      .leftJoinAndSelect('order.event', 'event')
      .leftJoinAndSelect('order.user', 'user')
      .orderBy('order.createdAt', 'DESC');

    if (filters.eventId) {
      qb.andWhere('order.eventId = :eventId', { eventId: filters.eventId });
    }

    if (filters.status) {
      qb.andWhere('order.status = :status', { status: filters.status });
    }

    if (filters.from) {
      qb.andWhere('order.createdAt >= :from', { from: filters.from });
    }

    if (filters.to) {
      qb.andWhere('order.createdAt <= :to', { to: filters.to });
    }

    return qb.getMany();
  }

  async getStats(): Promise<{
    totalOrders: number;
    totalRevenue: number;
    paidOrders: number;
    pendingOrders: number;
    ordersByEvent: { eventId: string; eventTitle: string; count: number; revenue: number }[];
    ordersByDay: { date: string; count: number; revenue: number }[];
  }> {
    const totalOrders = await this.ordersRepository.count();
    const paidOrders = await this.ordersRepository.count({ where: { status: OrderStatus.PAID } });
    const pendingOrders = await this.ordersRepository.count({ where: { status: OrderStatus.PENDING } });

    const revenueResult = await this.ordersRepository
      .createQueryBuilder('order')
      .select('COALESCE(SUM(order.totalAmount), 0)', 'total')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .getRawOne();
    const totalRevenue = parseFloat(revenueResult.total || '0');

    const ordersByEvent = await this.ordersRepository
      .createQueryBuilder('order')
      .leftJoin('order.event', 'event')
      .select('order.eventId', 'eventId')
      .addSelect('event.title', 'eventTitle')
      .addSelect('COUNT(order.id)', 'count')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'revenue')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .groupBy('order.eventId')
      .addGroupBy('event.title')
      .getRawMany();

    const ordersByDay = await this.ordersRepository
      .createQueryBuilder('order')
      .select("DATE_TRUNC('day', order.createdAt)", 'date')
      .addSelect('COUNT(order.id)', 'count')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'revenue')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .groupBy("DATE_TRUNC('day', order.createdAt)")
      .orderBy("DATE_TRUNC('day', order.createdAt)", 'ASC')
      .getRawMany();

    return {
      totalOrders,
      totalRevenue,
      paidOrders,
      pendingOrders,
      ordersByEvent: ordersByEvent.map(o => ({
        eventId: o.eventId,
        eventTitle: o.eventTitle || 'Inconnu',
        count: parseInt(o.count, 10),
        revenue: parseFloat(o.revenue || '0'),
      })),
      ordersByDay: ordersByDay.map(o => ({
        date: o.date,
        count: parseInt(o.count, 10),
        revenue: parseFloat(o.revenue || '0'),
      })),
    };
  }
}
