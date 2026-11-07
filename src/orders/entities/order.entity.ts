import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Event } from '../../events/entities/event.entity';
import { OrderItem } from './order-item.entity';
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

  @Column({ type: 'varchar', unique: true })
  reference: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar' })
  customerName: string;

  @Column({ type: 'varchar' })
  customerPhone: string;

  @Column({ type: 'varchar', nullable: true })
  customerEmail: string | null;

  // 🆕 GPS du client à l'achat (pour clustering automatique)
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  customerLat: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  customerLng: number | null;

  @Column({ type: 'int', default: 0 })
  transportQuantity: number;

  @Column({ type: 'int', default: 0 })
  parkingQuantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'enum', enum: PaymentProvider, nullable: true })
  paymentProvider: PaymentProvider | null;

  @Column({ type: 'varchar', nullable: true })
  paymentTransactionId: string | null;

  @Column({ type: 'varchar', nullable: true })
  qrCodeData: string | null;

  @Column({ type: 'uuid', nullable: true })
  pickupPointId: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, { eager: true })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'uuid', nullable: true })

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @OneToMany(() => Ticket, (t) => t.order)
  tickets: Ticket[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
