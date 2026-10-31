import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
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

  @Get('verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AGENT')
  async verify(@Query('qr') qr: string) {
    return this.ticketsService.verify(qr);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Req() req: any) {
    const ticket = await this.ticketsService.findOne(id);
    const role = req.user.role;
    const isOwner = ticket.ownerId === req.user.id;
    const isStaff =
      role === 'ADMIN' ||
      role === 'AGENT' ||
      role === 'COORDINATOR' ||
      role === 'SUPER_ADMIN';
    if (!isOwner && !isStaff) {
      throw new ForbiddenException('Accès refusé');
    }
    return ticket;
  }

  @Post(':id/share')
  @UseGuards(JwtAuthGuard)
  async share(@Param('id') id: string, @Req() req: any) {
    return this.ticketsService.share(id, req.user.id);
  }
}
