import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminOrdersService } from './admin-orders.service';
import { OrderFiltersDto } from './dto/order-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  @Get('orders')
  @Roles('ADMIN', 'SUPER_ADMIN', 'COORDINATOR')
  findAll(@Query() filters: OrderFiltersDto) {
    return this.adminOrdersService.findAll(filters);
  }

  @Get('stats')
  @Roles('ADMIN', 'SUPER_ADMIN')
  getStats() {
    return this.adminOrdersService.getStats();
  }
}
