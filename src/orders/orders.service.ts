import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus, PaymentProvider } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { EventsService } from '../events/events.service';
import { QrService } from '../tickets/qr.service';
import { Ticket, TicketType, TicketStatus } from '../tickets/entities/ticket.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    private readonly eventsService: EventsService,
    private readonly qrService: QrService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateOrderDto, userId?: string): Promise<Order> {
    const event = await this.eventsService.findOne(dto.eventId);

    if (event.availableSeats < dto.ticketQuantity) {
      throw new BadRequestException('Pas assez de places disponibles');
    }

    const totalAmount =
      dto.ticketQuantity * Number(event.startingPrice) +
      (dto.hasTransport ? Number(event.transportPrice) * dto.ticketQuantity : 0) +
      (dto.hasParking ? Number(event.parkingPrice) : 0);

    const reference = `SGB-${uuidv4().substring(0, 8).toUpperCase()}`;

    const order = this.ordersRepository.create({
      ...dto,
      reference,
      totalAmount,
      status: OrderStatus.PENDING,
      qrCodeData: '',
      userId,
    });

    order.qrCodeData = this.qrService.generateTicketQr(order.id || reference);

    return this.ordersRepository.save(order);
  }

  async findOne(id: string): Promise<Order> {
    return this.ordersRepository.findOneOrFail({
      where: [{ id }, { reference: id }],
      relations: ['tickets'],
    });
  }

  async findAll(): Promise<Order[]> {
    return this.ordersRepository.find({
      order: { createdAt: 'DESC' },
      relations: ['tickets'],
    });
  }

  /**
   * Marque la commande comme payée ET génère les tickets (avec QR individuels)
   */
  async markAsPaid(
    id: string,
    paymentProvider: PaymentProvider,
    transactionId: string,
  ): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id },
        relations: ['tickets', 'event'],
      });
      if (!order) throw new BadRequestException('Commande introuvable');
      if (order.status === OrderStatus.PAID) {
        throw new BadRequestException('Commande déjà payée');
      }

      order.status = OrderStatus.PAID;
      order.paidAt = new Date();
      order.paymentProvider = paymentProvider;
      order.paymentTransactionId = transactionId;

      // Générer les tickets
      const tickets: Ticket[] = [];
      for (let i = 0; i < order.ticketQuantity; i++) {
        const ticket = manager.create(Ticket, {
          orderId: order.id,
          ownerId: order.userId,
          type: TicketType.TICKET,
          status: TicketStatus.VALID,
          passengerName: order.customerName,
          passengerPhone: order.customerPhone,
          qrCode: '',
        });
        const savedTicket = await manager.save(ticket);
        savedTicket.qrCode = this.qrService.generateTicketQr(savedTicket.id);
        await manager.save(savedTicket);
        tickets.push(savedTicket);
      }

      if (order.hasTransport) {
        for (let i = 0; i < order.ticketQuantity; i++) {
          const t = manager.create(Ticket, {
            orderId: order.id,
            ownerId: order.userId,
            type: TicketType.TRANSPORT,
            status: TicketStatus.VALID,
            passengerName: order.customerName,
            passengerPhone: order.customerPhone,
            qrCode: '',
          });
          const saved = await manager.save(t);
          saved.qrCode = this.qrService.generateTicketQr(saved.id);
          await manager.save(saved);
          tickets.push(saved);
        }
      }

      if (order.hasParking) {
        const t = manager.create(Ticket, {
          orderId: order.id,
          ownerId: order.userId,
          type: TicketType.PARKING,
          status: TicketStatus.VALID,
          qrCode: '',
        });
        const saved = await manager.save(t);
        saved.qrCode = this.qrService.generateTicketQr(saved.id);
        await manager.save(saved);
        tickets.push(saved);
      }

      await manager.save(order);
      return { ...order, tickets };
    });
  }

  async verifyQrCode(token: string): Promise<{ valid: boolean; order?: Order }> {
    const payload = this.qrService.verifyTicketQr(token);
    if (!payload) return { valid: false };

    const order = await this.findOne(payload.ticketId);
    if (!order || order.status !== OrderStatus.PAID) return { valid: false };

    return { valid: true, order };
  }
}
