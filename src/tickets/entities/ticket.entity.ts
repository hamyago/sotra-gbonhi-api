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

  @ManyToOne(() => Order, (order) => order.tickets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  orderId: string;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column({ nullable: true })
  ownerId: string;

  @Column({ type: 'enum', enum: TicketType })
  type: TicketType;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.VALID })
  status: TicketStatus;

  @Column({ nullable: true })
  seatNumber: string;

  @Column({ nullable: true })
  passengerName: string;

  @Column({ nullable: true })
  passengerPhone: string;

  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date;

  @Column({ nullable: true })
  usedBy: string;

  @Column({ type: 'int', default: 0 })
  scanCount: number;

  @Column({ nullable: true })
  sharedVia: string;

  @Column({ type: 'timestamp', nullable: true })
  sharedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
