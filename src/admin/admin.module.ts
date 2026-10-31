import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { AdminUsersService } from './admin-users.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminOrdersService } from './admin-orders.service';
import { AdminOrdersController } from './admin-orders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Order])],
  controllers: [AdminUsersController, AdminOrdersController],
  providers: [AdminUsersService, AdminOrdersService],
})
export class AdminModule {}
