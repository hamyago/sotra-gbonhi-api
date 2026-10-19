import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';

export enum TicketStatus {
  VALID = 'VALID',
  USED = 'USED',
  CANCELLED = 'CANCELLED',
  TRANSFERRED = 'TRANSFERRED',
}

export enum TicketType {
  TICKET = 'TICKET',
  TRANSPORT = 'TRANSPORT',
  PARKING = 'PARKING',
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  qrCode: string;

  @ManyToOne(() => Order, (order) => order.tickets, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'uuid' })
  orderId: string;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'ownerId' })
  owner: User | null;

  @Column({ type: 'uuid', nullable: true })
  ownerId: string | null;

  @Column({ type: 'enum', enum: TicketType })
  type: TicketType;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.VALID })
  status: TicketStatus;

  @Column({ nullable: true })
  seatNumber: string | null;

  @Column({ nullable: true })
  passengerName: string | null;

  @Column({ nullable: true })
  passengerPhone: string | null;

  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date | null;

  @Column({ nullable: true })
  usedBy: string | null;

  @Column({ type: 'int', default: 0 })
  scanCount: number;

  @Column({ nullable: true })
  sharedVia: string | null;

  @Column({ type: 'timestamp', nullable: true })
  sharedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
