import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Ticket, TicketStatus } from '../tickets/entities/ticket.entity';
import { OrderFiltersDto } from './dto/order-filters.dto';

export interface AdminStats {
  totalOrders: number;
  totalRevenue: number;
  paidOrders: number;
  pendingOrders: number;
  averageBasket: number;
  ticketsSold: number;
  ticketsScanned: number;
  scanRate: number;
  ordersByEvent: {
    eventId: string;
    eventTitle: string;
    count: number;
    revenue: number;
  }[];
  ordersByDay: { date: string; count: number; revenue: number }[];
}

@Injectable()
export class AdminOrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
  ) {}

  async findAll(filters: OrderFiltersDto): Promise<Order[]> {
    const qb = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.tickets', 'tickets')
      .leftJoinAndSelect('order.event', 'event')
      .leftJoinAndSelect('order.user', 'user')
      .orderBy('order.createdAt', 'DESC')
      .take(filters.limit ?? 500);

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

  async getStats(): Promise<AdminStats> {
    const [
      totalOrders,
      paidOrders,
      pendingOrders,
      revenueResult,
      ordersByEvent,
      ordersByDay,
      ticketsSold,
      ticketsScanned,
    ] = await Promise.all([
      this.ordersRepository.count(),
      this.ordersRepository.count({ where: { status: OrderStatus.PAID } }),
      this.ordersRepository.count({ where: { status: OrderStatus.PENDING } }),
      this.ordersRepository
        .createQueryBuilder('order')
        .select('COALESCE(SUM(order.totalAmount), 0)', 'total')
        .where('order.status = :status', { status: OrderStatus.PAID })
        .getRawOne(),
      this.ordersRepository
        .createQueryBuilder('order')
        .leftJoin('order.event', 'event')
        .select('order.eventId', 'eventId')
        .addSelect('event.title', 'eventTitle')
        .addSelect('COUNT(order.id)', 'count')
        .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'revenue')
        .where('order.status = :status', { status: OrderStatus.PAID })
        .groupBy('order.eventId')
        .addGroupBy('event.title')
        .getRawMany(),
      this.ordersRepository
        .createQueryBuilder('order')
        .select("DATE_TRUNC('day', order.createdAt)", 'date')
        .addSelect('COUNT(order.id)', 'count')
        .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'revenue')
        .where('order.status = :status', { status: OrderStatus.PAID })
        .groupBy("DATE_TRUNC('day', order.createdAt)")
        .orderBy("DATE_TRUNC('day', order.createdAt)", 'ASC')
        .getRawMany(),
      this.ticketsRepository
        .createQueryBuilder('ticket')
        .leftJoin('ticket.order', 'order')
        .where('order.status = :status', { status: OrderStatus.PAID })
        .getCount(),
      this.ticketsRepository.count({
        where: { status: TicketStatus.USED },
      }),
    ]);

    const totalRevenue = parseFloat(revenueResult.total || '0');
    const averageBasket = paidOrders > 0 ? totalRevenue / paidOrders : 0;
    const scanRate = ticketsSold > 0 ? (ticketsScanned / ticketsSold) * 100 : 0;

    return {
      totalOrders,
      totalRevenue,
      paidOrders,
      pendingOrders,
      averageBasket: Math.round(averageBasket),
      ticketsSold,
      ticketsScanned,
      scanRate: Math.round(scanRate * 10) / 10,
      ordersByEvent: ordersByEvent.map((o) => ({
        eventId: o.eventId,
        eventTitle: o.eventTitle || 'Inconnu',
        count: parseInt(o.count, 10),
        revenue: parseFloat(o.revenue || '0'),
      })),
      ordersByDay: ordersByDay.map((o) => ({
        date: o.date,
        count: parseInt(o.count, 10),
        revenue: parseFloat(o.revenue || '0'),
      })),
    };
  }
}
