import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { EventTicketCategory } from './event-ticket-category.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar' })
  category: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column({ type: 'varchar' })
  venue: string;

  @Column({ type: 'varchar', nullable: true })
  venueAddress: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  transportPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  parkingPrice: number;

  @Column({ type: 'varchar', default: 'DRAFT' })
  status: string;

  @OneToMany(() => EventTicketCategory, (cat) => cat.event, { cascade: true })
  ticketCategories: EventTicketCategory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
