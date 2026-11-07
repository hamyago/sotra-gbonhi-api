import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { AdminUsersService } from './admin-users.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminOrdersService } from './admin-orders.service';
import { AdminOrdersExportService } from './admin-orders.export';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminHeatmapController } from './admin-heatmap.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Order, Ticket])],
  controllers: [AdminUsersController, AdminOrdersController, AdminHeatmapController],
  providers: [AdminUsersService, AdminOrdersService, AdminOrdersExportService],
})
export class AdminModule {}
