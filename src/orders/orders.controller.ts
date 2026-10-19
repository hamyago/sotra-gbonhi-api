import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentProvider } from './entities/order.entity';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateOrderDto, @CurrentUser('id') userId: string) {
    return this.ordersService.create(dto, userId);
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Get('verify')
  async verify(@Query('token') token: string) {
    return this.ordersService.verifyQrCode(token);
  }

  @Post(':id/mark-paid')
  async markPaid(
    @Param('id') id: string,
    @Body('paymentProvider') paymentProvider: PaymentProvider,
    @Body('transactionId') transactionId: string,
  ) {
    return this.ordersService.markAsPaid(id, paymentProvider, transactionId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }
}
