import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Bus } from '../../buses/entities/bus.entity';
import { User } from '../../users/entities/user.entity';
import { Event } from '../../events/entities/event.entity';
import { PickupPoint } from '../../pickup-points/entities/pickup-point.entity';

export enum MissionStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('missions')
export class Mission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'uuid' })
  busId: string;

  @ManyToOne(() => Bus, { eager: true })
  @JoinColumn({ name: 'busId' })
  bus: Bus;

  @Column({ type: 'uuid' })
  agentId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'agentId' })
  agent: User;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, { eager: true })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'timestamp' })
  departureTime: Date;

  @Column({ type: 'enum', enum: MissionStatus, default: MissionStatus.SCHEDULED })
  status: MissionStatus;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  currentLat: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  currentLng: number | null;

  @Column({ type: 'timestamp', nullable: true })
  lastPositionUpdate: Date | null;

  @OneToMany(() => PickupPoint, (p) => p.mission, { cascade: true })
  pickupPoints: PickupPoint[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
