import { Injectable, BadRequestException, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(OrdersService.name);

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

    const order: Order = this.ordersRepository.create({
      ...dto,
      reference,
      totalAmount,
      status: OrderStatus.PENDING,
      userId: userId || null,
      qrCodeData: 'PENDING',
    });

    const savedOrder: Order = await this.ordersRepository.save(order);
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

      this.logger.log(`markAsPaid: order.id=${order.id}`);

      order.status = OrderStatus.PAID;
      order.paidAt = new Date();
      order.paymentProvider = paymentProvider;
      order.paymentTransactionId = transactionId;

      const tickets: Ticket[] = [];

      const createTicket = async (type: TicketType): Promise<Ticket> => {
        const ticketId = uuidv4();
        const qrCode = this.qrService.generateTicketQr(ticketId);

        await manager
          .createQueryBuilder()
          .insert()
          .into('tickets')
          .values({
            id: ticketId,
            qrCode: qrCode,
            orderId: order.id,
            ownerId: order.userId || null,
            type: type,
            status: TicketStatus.VALID,
            passengerName: type !== TicketType.PARKING ? order.customerName : null,
            passengerPhone: type !== TicketType.PARKING ? order.customerPhone : null,
            scanCount: 0,
          })
          .execute();

        const createdTicket = await manager.findOne(Ticket, {
          where: { id: ticketId },
        });

        if (!createdTicket) {
          throw new BadRequestException('Échec création ticket');
        }
        return createdTicket;
      };

      for (let i = 0; i < order.ticketQuantity; i++) {
        tickets.push(await createTicket(TicketType.TICKET));
      }

      if (order.hasTransport) {
        for (let i = 0; i < order.ticketQuantity; i++) {
          tickets.push(await createTicket(TicketType.TRANSPORT));
        }
      }

      if (order.hasParking) {
        tickets.push(await createTicket(TicketType.PARKING));
      }

      await manager.save(order);
      return { ...order, tickets } as Order;
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
