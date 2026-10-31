import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PickupPoint } from './entities/pickup-point.entity';
import { CreatePickupPointDto } from './dto/create-pickup-point.dto';
import { UpdatePickupPointDto } from './dto/update-pickup-point.dto';
import { Mission } from '../missions/entities/mission.entity';

@Injectable()
export class PickupPointsService {
  constructor(
    @InjectRepository(PickupPoint)
    private readonly pickupPointsRepository: Repository<PickupPoint>,
    @InjectRepository(Mission)
    private readonly missionsRepository: Repository<Mission>,
  ) {}

  async create(dto: CreatePickupPointDto): Promise<PickupPoint> {
    const mission = await this.missionsRepository.findOne({ where: { id: dto.missionId } });
    if (!mission) throw new NotFoundException('Mission introuvable');

    const point = this.pickupPointsRepository.create({
      missionId: dto.missionId,
      name: dto.name,
      latitude: dto.latitude,
      longitude: dto.longitude,
      order: dto.order ?? 0,
      expectedPassengers: dto.expectedPassengers ?? 0,
    });
    return this.pickupPointsRepository.save(point);
  }

  async findAll(): Promise<PickupPoint[]> {
    return this.pickupPointsRepository.find({
      relations: ['mission'],
      order: { order: 'ASC' },
    });
  }

  async findByMission(missionId: string): Promise<PickupPoint[]> {
    return this.pickupPointsRepository.find({
      where: { missionId },
      order: { order: 'ASC' },
    });
  }

  async findOne(id: string): Promise<PickupPoint> {
    const point = await this.pickupPointsRepository.findOne({
      where: { id },
      relations: ['mission'],
    });
    if (!point) throw new NotFoundException('Point de rassemblement introuvable');
    return point;
  }

  async update(id: string, dto: UpdatePickupPointDto): Promise<PickupPoint> {
    const point = await this.findOne(id);
    if (dto.name) point.name = dto.name;
    if (dto.latitude !== undefined) point.latitude = dto.latitude;
    if (dto.longitude !== undefined) point.longitude = dto.longitude;
    if (dto.order !== undefined) point.order = dto.order;
    if (dto.expectedPassengers !== undefined) point.expectedPassengers = dto.expectedPassengers;
    return this.pickupPointsRepository.save(point);
  }

  async remove(id: string): Promise<{ message: string }> {
    const point = await this.findOne(id);
    await this.pickupPointsRepository.remove(point);
    return { message: 'Point de rassemblement supprimé' };
  }
}
