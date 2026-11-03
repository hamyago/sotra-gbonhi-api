import { Controller, Get, Param } from '@nestjs/common';
import { PickupPointsService } from './pickup-points.service';

@Controller('events/:eventId/pickup-points')
export class PublicPickupPointsController {
  constructor(private readonly pickupPointsService: PickupPointsService) {}

  @Get()
  findByEvent(@Param('eventId') eventId: string) {
    return this.pickupPointsService.findByEvent(eventId);
  }
}
