import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mission } from './entities/mission.entity';
import { User } from '../users/entities/user.entity';
import { Bus } from '../buses/entities/bus.entity';
import { Event } from '../events/entities/event.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { MissionsService } from './missions.service';
import { MissionsController } from './missions.controller';
import { PickupPointsModule } from '../pickup-points/pickup-points.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Mission, User, Bus, Event, Ticket]),
    forwardRef(() => PickupPointsModule),
  ],
  controllers: [MissionsController],
  providers: [MissionsService],
  exports: [MissionsService, TypeOrmModule],
})
export class MissionsModule {}
