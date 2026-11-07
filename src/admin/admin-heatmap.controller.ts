import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin/events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminHeatmapController {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {}

  @Get(':eventId/heatmap')
  @Roles('ADMIN', 'SUPER_ADMIN', 'COORDINATOR')
  async getHeatmap(@Param('eventId') eventId: string) {
    // Récupérer toutes les commandes PAID avec GPS
    const orders = await this.ordersRepository
      .createQueryBuilder('order')
      .where('order.eventId = :eventId', { eventId })
      .andWhere('order.status = :status', { status: 'PAID' })
      .andWhere('order.customerLat IS NOT NULL')
      .select([
        'order.customerLat',
        'order.customerLng',
        'order.customerName',
        'order.id',
      ])
      .getMany();

    // Clustering simple par grille (0.01° ≈ 1.1 km)
    const GRID_SIZE = 0.01;
    const clusters = new Map<string, { lat: number; lng: number; count: number; orders: string[] }>();

    for (const o of orders) {
      const lat = Number(o.customerLat);
      const lng = Number(o.customerLng);
      if (isNaN(lat) || isNaN(lng)) continue;

      const key = `${Math.round(lat / GRID_SIZE) * GRID_SIZE}_${Math.round(lng / GRID_SIZE) * GRID_SIZE}`;
      if (!clusters.has(key)) {
        clusters.set(key, { lat: 0, lng: 0, count: 0, orders: [] });
      }
      const c = clusters.get(key)!;
      c.lat += lat;
      c.lng += lng;
      c.count++;
      c.orders.push(o.id);
    }

    // Moyenne par cluster
    const result = Array.from(clusters.values()).map((c) => ({
      latitude: c.lat / c.count,
      longitude: c.lng / c.count,
      count: c.count,
      orders: c.orders,
    }));

    // Trier par count décroissant
    result.sort((a, b) => b.count - a.count);

    return {
      eventId,
      totalOrders: orders.length,
      totalWithGps: orders.filter((o) => o.customerLat != null).length,
      clusters: result.slice(0, 20), // Top 20 clusters
    };
  }
}
