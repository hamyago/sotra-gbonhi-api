import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('tracking')
@UseGuards(JwtAuthGuard)
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get(':eventId')
  async getTracking(@Param('eventId') eventId: string, @Req() req: any) {
    // Vérifier que l'utilisateur a payé au moins un billet pour cet événement
    const hasPaid = await this.trackingService.userHasPaidTicket(req.user.id, eventId);
    if (!hasPaid) {
      throw new ForbiddenException(
        'Vous devez avoir acheté un billet pour accéder au suivi',
      );
    }
    return this.trackingService.getTrackingForEvent(eventId);
  }
}
