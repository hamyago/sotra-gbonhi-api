import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PickupPoint } from './entities/pickup-point.entity';
import { Mission } from '../missions/entities/mission.entity';
import { PickupPointsService } from './pickup-points.service';
import { PickupPointsController } from './pickup-points.controller';
import { PublicPickupPointsController } from './public-pickup-points.controller';
import { MissionsModule } from '../missions/missions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PickupPoint, Mission]),
    forwardRef(() => MissionsModule),
  ],
  controllers: [PickupPointsController, PublicPickupPointsController],
  providers: [PickupPointsService],
  exports: [PickupPointsService, TypeOrmModule],
})
export class PickupPointsModule {}
