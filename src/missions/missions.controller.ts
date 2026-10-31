import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { MissionsService } from './missions.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Post('admin/missions')
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  create(@Body() dto: CreateMissionDto) {
    return this.missionsService.create(dto);
  }

  @Get('admin/missions')
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  findAll() {
    return this.missionsService.findAll();
  }

  @Get('admin/missions/:id')
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  findOne(@Param('id') id: string) {
    return this.missionsService.findOne(id);
  }

  @Patch('admin/missions/:id')
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateMissionDto) {
    return this.missionsService.update(id, dto);
  }

  @Delete('admin/missions/:id')
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  remove(@Param('id') id: string) {
    return this.missionsService.remove(id);
  }

  @Post('admin/missions/:id/start')
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  startByAdmin(@Param('id') id: string) {
    return this.missionsService.start(id);
  }

  @Post('admin/missions/:id/complete')
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  completeByAdmin(@Param('id') id: string) {
    return this.missionsService.complete(id);
  }

  // ========== AGENT ==========
  @Get('agent/missions')
  @Roles('AGENT')
  findMyMissions(@Req() req: any) {
    return this.missionsService.findByAgent(req.user.id);
  }

  @Get('agent/missions/:id')
  @Roles('AGENT')
  async findMyMission(@Param('id') id: string, @Req() req: any) {
    const mission = await this.missionsService.findOne(id);
    if (mission.agentId !== req.user.id) {
      throw new ForbiddenException('Accès interdit à cette mission');
    }
    return mission;
  }

  @Post('agent/missions/:id/start')
  @Roles('AGENT')
  async startByAgent(@Param('id') id: string, @Req() req: any) {
    const mission = await this.missionsService.findOne(id);
    if (mission.agentId !== req.user.id) {
      throw new ForbiddenException('Accès interdit à cette mission');
    }
    return this.missionsService.start(id);
  }

  @Post('agent/missions/:id/complete')
  @Roles('AGENT')
  async completeByAgent(@Param('id') id: string, @Req() req: any) {
    const mission = await this.missionsService.findOne(id);
    if (mission.agentId !== req.user.id) {
      throw new ForbiddenException('Accès interdit à cette mission');
    }
    return this.missionsService.complete(id);
  }

  @Post('agent/missions/:id/position')
  @Roles('AGENT')
  async updatePosition(
    @Param('id') id: string,
    @Body() body: { latitude: number; longitude: number },
    @Req() req: any,
  ) {
    const mission = await this.missionsService.findOne(id);
    if (mission.agentId !== req.user.id) {
      throw new ForbiddenException('Accès interdit à cette mission');
    }
    return this.missionsService.updatePosition(id, body.latitude, body.longitude);
  }

  // ⚡ NOUVEAU : Liste des passagers
  @Get('agent/missions/:id/passengers')
  @Roles('AGENT')
  async getMissionPassengers(@Param('id') id: string, @Req() req: any) {
    const mission = await this.missionsService.findOne(id);
    if (mission.agentId !== req.user.id) {
      throw new ForbiddenException('Accès interdit à cette mission');
    }
    return this.missionsService.getMissionPassengers(id);
  }
}
