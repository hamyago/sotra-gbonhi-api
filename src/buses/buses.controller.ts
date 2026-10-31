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
import { BusesService } from './buses.service';
import { CreateBusDto } from './dto/create-bus.dto';
import { UpdateBusDto } from './dto/update-bus.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin/buses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
export class BusesController {
  constructor(private readonly busesService: BusesService) {}

  @Post()
  create(@Body() dto: CreateBusDto) {
    return this.busesService.create(dto);
  }

  @Get()
  findAll() {
    return this.busesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.busesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBusDto) {
    return this.busesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.busesService.remove(id);
  }
}
