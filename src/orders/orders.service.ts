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
        transportQuantity: dto.transportQuantity,
        parkingQuantity: dto.parkingQuantity,
        totalAmount,
        status: OrderStatus.PENDING,
        paymentProvider: dto.paymentProvider,
        eventId: event.id,
        qrCodeData: 'PENDING',
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
      const order = await manager.findOne(Order, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
        relations: ['items', 'items.ticketCategory', 'event'],
      });
      if (!order) throw new BadRequestException('Commande introuvable');
      if (order.status === OrderStatus.PAID) {
        throw new BadRequestException('Commande déjà payée');
      }

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
  ): Promise<void> {
    const ticketId = uuidv4();
    const qrCode = this.qrService.generateTicketQr(ticketId);
    await manager.query(
      `INSERT INTO tickets (id, "qrCode", "orderId", "ownerId", "ticketCategoryId", type, status, "passengerName", "passengerPhone", "scanCount", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6::tickets_type_enum, $7::tickets_status_enum, $8, $9, 0, NOW(), NOW())`,
      [
        ticketId,
        qrCode,
        order.id,
        order.userId,
        ticketCategoryId,
        type,
        TicketStatus.VALID,
        type === TicketType.TICKET ? order.customerName : null,
        type === TicketType.TICKET ? order.customerPhone : null,
      ],
    );
  }
}
