import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { Order } from '../orders/entities/order.entity';
import { Mission } from '../missions/entities/mission.entity';
import { PickupPoint } from '../pickup-points/entities/pickup-point.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Mission, PickupPoint, User])],
  controllers: [TrackingController],
  providers: [TrackingService],
})
export class TrackingModule {}
