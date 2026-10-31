import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bus } from './entities/bus.entity';
import { CreateBusDto } from './dto/create-bus.dto';
import { UpdateBusDto } from './dto/update-bus.dto';

@Injectable()
export class BusesService {
  constructor(
    @InjectRepository(Bus)
    private readonly busesRepository: Repository<Bus>,
  ) {}

  async create(dto: CreateBusDto): Promise<Bus> {
    const existing = await this.busesRepository.findOne({ where: { plate: dto.plate } });
    if (existing) {
      throw new ConflictException(`Le bus ${dto.plate} existe déjà`);
    }
    const bus = this.busesRepository.create(dto);
    return this.busesRepository.save(bus);
  }

  async findAll(): Promise<Bus[]> {
    return this.busesRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Bus> {
    const bus = await this.busesRepository.findOne({ where: { id } });
    if (!bus) throw new NotFoundException('Bus introuvable');
    return bus;
  }

  async update(id: string, dto: UpdateBusDto): Promise<Bus> {
    const bus = await this.findOne(id);
    Object.assign(bus, dto);
    return this.busesRepository.save(bus);
  }

  async remove(id: string): Promise<{ message: string }> {
    const bus = await this.findOne(id);
    await this.busesRepository.remove(bus);
    return { message: 'Bus supprimé' };
  }
}
