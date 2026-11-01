import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { AdminOrdersService } from './admin-orders.service';
import { AdminOrdersExportService } from './admin-orders.export';
import { OrderFiltersDto } from './dto/order-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminOrdersController {
  constructor(
    private readonly adminOrdersService: AdminOrdersService,
    private readonly adminOrdersExportService: AdminOrdersExportService,
  ) {}

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

  @Get('orders/export.pdf')
  @Roles('ADMIN', 'SUPER_ADMIN', 'COORDINATOR')
  async exportOrdersPdf(
    @Query() filters: OrderFiltersDto,
    @Res() res: Response,
  ) {
    const pdf = await this.adminOrdersExportService.generateOrdersPdf(filters);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="sotra-rapport-${new Date().toISOString().split('T')[0]}.pdf"`,
    );
    res.send(pdf);
  }
}
