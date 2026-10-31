import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Req() req: any) {
    return this.ordersService.findByUser(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Req() req: any) {
    const order = await this.ordersService.findOne(id);
    const role = req.user.role;
    const isStaff =
      role === 'ADMIN' ||
      role === 'AGENT' ||
      role === 'COORDINATOR' ||
      role === 'SUPER_ADMIN';
    if (order.userId !== req.user.id && !isStaff) {
      throw new ForbiddenException('Accès refusé');
    }
    return order;
  }

  // ⚠️ Endpoint de test — à remplacer par webhook DigitalPay
  @Post(':id/mark-paid')
  async markPaid(@Param('id') id: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
    return this.ordersService.markAsPaid(id);
  }
}
