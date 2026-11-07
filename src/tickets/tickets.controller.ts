import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { SetPickupPointDto } from './dto/set-pickup-point.dto';
import { AssignSeatsDto } from '../orders/dto/assign-seats.dto';
import { TransferTicketDto } from './dto/transfer-ticket.dto';
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

  @Post('orders/:orderId/assign-seats')
  @UseGuards(JwtAuthGuard)
  async assignSeats(
    @Param('orderId') orderId: string,
    @Body() dto: AssignSeatsDto,
    @Req() req: any,
  ) {
    return this.ticketsService.assignSeats(orderId, dto.seats, req.user.id);
  }

  @Get('verify-by-code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AGENT')
  async verifyByCode(@Query('code') code: string) {
    return this.ticketsService.verifyByCode(code);
  }

  @Get(':id/tracking')
  @UseGuards(JwtAuthGuard)
  async getTracking(
    @Param('id') ticketId: string,
    @Req() req: any,
  ) {
    return this.ticketsService.getTicketTracking(ticketId, req.user.id);
  }

  @Patch(':id/pickup-point')
  @UseGuards(JwtAuthGuard)
  async setPickupPoint(
    @Param('id') ticketId: string,
    @Body() dto: SetPickupPointDto,
    @Req() req: any,
  ) {
    return this.ticketsService.setPickupPoint(
      ticketId,
      dto.pickupPointId,
      req.user.id,
    );
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

  @Post(':id/transfer')
  @UseGuards(JwtAuthGuard)
  async transfer(
    @Param('id') id: string,
    @Body() dto: TransferTicketDto,
    @Req() req: any,
  ) {
    return this.ticketsService.transfer(id, dto, req.user.id);
  }
}
