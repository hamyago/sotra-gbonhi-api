import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { EventTicketCategory } from '../../events/entities/event-ticket-category.entity';

export enum TicketType {
  TICKET = 'TICKET',
  TRANSPORT = 'TRANSPORT',
  PARKING = 'PARKING',
}

export enum TicketStatus {
  VALID = 'VALID',
  USED = 'USED',
  CANCELLED = 'CANCELLED',
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  qrCode: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (o) => o.tickets, { eager: true })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'uuid', nullable: true })
  ownerId: string | null;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'ownerId' })
  owner: User | null;

  @Column({ type: 'uuid', nullable: true })
  ticketCategoryId: string | null;

  @ManyToOne(() => EventTicketCategory, { eager: true, nullable: true })
  @JoinColumn({ name: 'ticketCategoryId' })
  ticketCategory: EventTicketCategory | null;

  @Column({ type: 'enum', enum: TicketType })
  type: TicketType;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.VALID })
  status: TicketStatus;

  @Column({ type: 'varchar', nullable: true })
  seatNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  passengerName: string | null;

  @Column({ type: 'varchar', nullable: true })
  passengerPhone: string | null;

  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  usedBy: string | null;

  @Column({ type: 'int', default: 0 })
  scanCount: number;

  @Column({ type: 'varchar', nullable: true })
  sharedVia: string | null;

  @Column({ type: 'timestamp', nullable: true })
  sharedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
