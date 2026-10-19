import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { QrCodeService } from './qr-code.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), EventsModule],
  controllers: [OrdersController],
  providers: [OrdersService, QrCodeService],
  exports: [OrdersService],
})
export class OrdersModule {}
