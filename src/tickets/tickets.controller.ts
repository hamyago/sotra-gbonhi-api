import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findMyTickets(@CurrentUser('id') userId: string) {
    return this.ticketsService.findByUserId(userId);
  }

  @Get('verify')
  async verify(@Query('token') token: string) {
    return this.ticketsService.verifyQr(token);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Post(':id/share')
  @UseGuards(JwtAuthGuard)
  async share(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('phone') phone: string,
  ) {
    return this.ticketsService.shareByPhone(id, userId, phone);
  }
}
