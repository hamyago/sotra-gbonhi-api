import { Controller, Get, Post, Param, Query, UseGuards, Req } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findMyTickets(@Req() req: any) {
    return this.ticketsService.findByUser(req.user.id);
  }

  // 🔒 Seuls les AGENT peuvent scanner
  @Get('verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AGENT')
  async verify(@Query('qr') qr: string) {
    return this.ticketsService.verify(qr);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Post(':id/share')
  @UseGuards(JwtAuthGuard)
  async share(@Param('id') id: string, @Req() req: any) {
    return this.ticketsService.share(id, req.user.id);
  }
}
