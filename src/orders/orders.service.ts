import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { EventsService } from '../events/events.service';
import { QrService } from '../tickets/qr.service';
import {
  Ticket,
  TicketType,
  TicketStatus,
} from '../tickets/entities/ticket.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly itemsRepository: Repository<OrderItem>,
    private readonly eventsService: EventsService,
    private readonly qrService: QrService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateOrderDto, userId: string): Promise<Order> {
    const event = await this.eventsService.findOne(dto.eventId);
    if (!event) throw new BadRequestException('Événement introuvable');

    // Validation + calcul total AVANT la transaction
    let totalAmount = 0;
    const pendingItems: {
      ticketCategoryId: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[] = [];

    for (const itemDto of dto.items) {
      const category = event.ticketCategories.find(
        (c) => c.id === itemDto.ticketCategoryId,
      );
      if (!category) {
        throw new BadRequestException(
          `Catégorie ${itemDto.ticketCategoryId} introuvable`,
        );
      }
      if (!category.isActive) {
        throw new BadRequestException(`Catégorie ${category.name} désactivée`);
      }
      if (category.availableSeats < itemDto.quantity) {
        throw new BadRequestException(
          `Pas assez de places disponibles pour ${category.name}`,
        );
      }
      const subtotal = Number(category.price) * itemDto.quantity;
      totalAmount += subtotal;
      pendingItems.push({
        ticketCategoryId: category.id,
        quantity: itemDto.quantity,
        unitPrice: Number(category.price),
        subtotal,
      });
    }

    totalAmount += dto.transportQuantity * Number(event.transportPrice);
    totalAmount += dto.parkingQuantity * Number(event.parkingPrice);

    const reference = `SGB-${uuidv4().substring(0, 8).toUpperCase()}`;

    return this.dataSource.transaction(async (manager) => {
      const order = manager.create(Order, {
        reference,
        userId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail ?? null,
      customerLat: dto.customerLat ?? null,
      customerLng: dto.customerLng ?? null,
        transportQuantity: dto.transportQuantity,
        parkingQuantity: dto.parkingQuantity,
        totalAmount,
        status: OrderStatus.PENDING,
        paymentProvider: dto.paymentProvider,
        eventId: event.id,
        qrCodeData: 'PENDING',
        pickupPointId: dto.pickupPointId ?? null,
      });
      const savedOrder = await manager.save(order);

      const items = pendingItems.map((p) =>
        manager.create(OrderItem, {
          orderId: savedOrder.id,
          ...p,
        }),
      );
      await manager.save(items);

      savedOrder.qrCodeData = this.qrService.generateTicketQr(savedOrder.id);
      return manager.save(savedOrder);
    });
  }

  async findAll(): Promise<Order[]> {
    return this.ordersRepository.find({
      relations: ['items', 'items.ticketCategory', 'tickets', 'event', 'user'],
      order: { createdAt: 'DESC' },
      take: 500,
    });
  }

  async findOne(id: string): Promise<Order> {
    return this.ordersRepository.findOneOrFail({
      where: [{ id }, { reference: id }],
      relations: ['items', 'items.ticketCategory', 'tickets', 'event', 'user'],
    });
  }

  async findByUser(userId: string): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { userId },
      relations: ['items', 'items.ticketCategory', 'tickets', 'event'],
      order: { createdAt: 'DESC' },
    });
  }

  async markAsPaid(id: string): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Lock sur la table orders uniquement (sans relations)
      const locked = await manager
        .getRepository(Order)
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .where('order.id = :id', { id })
        .getOne();
      if (!locked) throw new BadRequestException('Commande introuvable');
      if (locked.status === OrderStatus.PAID) {
        throw new BadRequestException('Commande déjà payée');
      }

      // 2. Recharger avec relations
      const order = await manager.findOneOrFail(Order, {
        where: { id },
        relations: ['items', 'items.ticketCategory', 'event'],
      });

      await manager.update(Order, id, {
        status: OrderStatus.PAID,
        paidAt: new Date(),
      });

      for (const item of order.items) {
        await manager.decrement(
          'EventTicketCategory',
          { id: item.ticketCategoryId },
          'availableSeats',
          item.quantity,
        );
      }

      for (const item of order.items) {
        for (let i = 0; i < item.quantity; i++) {
          await this.createTicket(
            manager,
            order,
            TicketType.TICKET,
            item.ticketCategoryId,
            i,  // seatIndex pour numérotation
          );
        }
      }
      for (let i = 0; i < order.transportQuantity; i++) {
        await this.createTicket(manager, order, TicketType.TRANSPORT, null);
      }
      for (let i = 0; i < order.parkingQuantity; i++) {
        await this.createTicket(manager, order, TicketType.PARKING, null);
      }

      return manager.findOneOrFail(Order, {
        where: { id },
        relations: ['items', 'items.ticketCategory', 'tickets', 'event'],
      });
    });
  }

  private async createTicket(
    manager: any,
    order: Order,
    type: TicketType,
    ticketCategoryId: string | null,
    seatIndex: number = 0,
  ): Promise<void> {
    const ticketId = uuidv4();
    const qrCode = this.qrService.generateTicketQr(ticketId);
    // 🆕 Sièges auto-assignés : A1, A2, A3...
    let seatNumber: string | null = null;
    if (type === TicketType.TICKET && ticketCategoryId) {
      // Récupérer la catégorie
      const cat = await manager.findOne('EventTicketCategory', {
        where: { id: ticketCategoryId },
      });
      if (cat && cat.assignSeats) {
        seatNumber = `A${seatIndex + 1}`;
      }
    }
    await manager.query(
      `INSERT INTO tickets (id, "qrCode", "orderId", "ownerId", "ticketCategoryId", type, status, "seatNumber", "passengerName", "passengerPhone", "scanCount", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6::tickets_type_enum, $7::tickets_status_enum, $8, $9, $10, 0, NOW(), NOW())`,
      [
        ticketId,
        qrCode,
        order.id,
        order.userId,
        ticketCategoryId,
        type,
        TicketStatus.VALID,
        seatNumber,
        type === TicketType.TICKET ? order.customerName : null,
        type === TicketType.TICKET ? order.customerPhone : null,
      ],
    );

    // 🆕 Assigner le point de rassemblement au ticket si défini
    if (order.pickupPointId) {
      await manager.query(
        `UPDATE tickets SET "pickupPointId" = $1 WHERE id = $2`,
        [order.pickupPointId, ticketId],
      );
    }
  }
}
