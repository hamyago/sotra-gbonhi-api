import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { PickupPoint } from '../pickup-points/entities/pickup-point.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { Mission } from '../missions/entities/mission.entity';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { QrService } from './qr.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, PickupPoint, Order, User, Mission])],
  controllers: [TicketsController],
  providers: [TicketsService, QrService],
  exports: [TicketsService, QrService],
})
export class TicketsModule {}
