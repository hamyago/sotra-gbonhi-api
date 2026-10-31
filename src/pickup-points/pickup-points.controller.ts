import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { PickupPointsService } from './pickup-points.service';
import { CreatePickupPointDto } from './dto/create-pickup-point.dto';
import { UpdatePickupPointDto } from './dto/update-pickup-point.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin/pickup-points')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
export class PickupPointsController {
  constructor(private readonly pickupPointsService: PickupPointsService) {}

  @Post()
  create(@Body() dto: CreatePickupPointDto) {
    return this.pickupPointsService.create(dto);
  }

  @Get()
  findAll() {
    return this.pickupPointsService.findAll();
  }

  @Get('mission/:missionId')
  findByMission(@Param('missionId') missionId: string) {
    return this.pickupPointsService.findByMission(missionId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pickupPointsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePickupPointDto) {
    return this.pickupPointsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pickupPointsService.remove(id);
  }
}
