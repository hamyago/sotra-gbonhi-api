import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Mission } from '../../missions/entities/mission.entity';

@Entity('pickup_points')
export class PickupPoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  missionId: string;

  @ManyToOne(() => Mission, (m) => m.pickupPoints, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'missionId' })
  mission: Mission;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ type: 'int', default: 0 })
  expectedPassengers: number;

  @Column({ type: 'int', default: 0 })
  estimatedMinutesFromStart: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
