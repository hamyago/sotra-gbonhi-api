import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { User } from '../../users/entities/user.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentProvider {
  ORANGE_MONEY = 'ORANGE_MONEY',
  MTN_MOMO = 'MTN_MOMO',
  MOOV_MONEY = 'MOOV_MONEY',
  WAVE = 'WAVE',
  CARD = 'CARD',
  DIGITALPAY = 'DIGITALPAY',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  reference: string;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @Column()
  customerName: string;

  @Column()
  customerPhone: string;

  @Column({ nullable: true })
  customerEmail: string;

  @Column({ type: 'int' })
  ticketQuantity: number;

  @Column({ type: 'boolean', default: false })
  hasTransport: boolean;

  @Column({ type: 'boolean', default: false })
  hasParking: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'enum', enum: PaymentProvider, nullable: true })
  paymentProvider: PaymentProvider;

  @Column({ nullable: true })
  paymentTransactionId: string;

  @Column({ type: 'text', nullable: true })
  qrCodeData: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @ManyToOne(() => Event, { eager: true })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column()
  eventId: string;

  @OneToMany(() => Ticket, (ticket) => ticket.order, { cascade: true })
  tickets: Ticket[];

  @CreateDateColumn()
  createdAt: Date;
}
