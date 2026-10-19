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

    // Créer la commande SANS QR (on le génère après avoir l'ID)
    const order = this.ordersRepository.create({
      ...dto,
      reference,
      totalAmount,
      status: OrderStatus.PENDING,
      userId: userId || null,
      qrCodeData: 'PENDING',
    });

    // Save pour obtenir l'ID
    const savedOrder = await this.ordersRepository.save(order);

    // Générer le QR de la commande avec l'ID réel
    savedOrder.qrCodeData = this.qrService.generateTicketQr(savedOrder.id);
    return this.ordersRepository.save(savedOrder);
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

      const tickets: Ticket[] = [];

      // Fonction helper pour créer un ticket avec QR unique
      const createTicketWithQr = async (
        ticketData: Partial<Ticket>,
      ): Promise<Ticket> => {
        const ticket = manager.create(Ticket, {
          ...ticketData,
          qrCode: `TEMP-${uuidv4()}`, // QR temporaire unique
        });
        const saved = await manager.save(ticket);
        saved.qrCode = this.qrService.generateTicketQr(saved.id);
        return manager.save(saved);
      };

      // Créer les tickets d'entrée
      for (let i = 0; i < order.ticketQuantity; i++) {
        const ticket = await createTicketWithQr({
          orderId: order.id,
          ownerId: order.userId || null,
          type: TicketType.TICKET,
          status: TicketStatus.VALID,
          passengerName: order.customerName,
          passengerPhone: order.customerPhone,
        });
        tickets.push(ticket);
      }

      // Créer les tickets de transport
      if (order.hasTransport) {
        for (let i = 0; i < order.ticketQuantity; i++) {
          const ticket = await createTicketWithQr({
            orderId: order.id,
            ownerId: order.userId || null,
            type: TicketType.TRANSPORT,
            status: TicketStatus.VALID,
            passengerName: order.customerName,
            passengerPhone: order.customerPhone,
          });
          tickets.push(ticket);
        }
      }

      // Créer le ticket de parking (1 seul pour toute la commande)
      if (order.hasParking) {
        const ticket = await createTicketWithQr({
          orderId: order.id,
          ownerId: order.userId || null,
          type: TicketType.PARKING,
          status: TicketStatus.VALID,
        });
        tickets.push(ticket);
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
