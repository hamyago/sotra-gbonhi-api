import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Event, EventStatus } from './entities/event.entity';
import { EventTicketCategory } from './entities/event-ticket-category.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepo: Repository<Event>,
    @InjectRepository(EventTicketCategory)
    private readonly categoriesRepo: Repository<EventTicketCategory>,
    private readonly dataSource: DataSource,
  ) {}

  async findAllPublic(): Promise<Event[]> {
    return this.eventsRepo.find({
      where: { status: EventStatus.PUBLISHED },
      relations: ['ticketCategories'],
      order: { date: 'ASC' },
    });
  }

  async findAllAdmin(): Promise<Event[]> {
    return this.eventsRepo.find({
      relations: ['ticketCategories'],
      order: { date: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventsRepo.findOne({
      where: { id },
      relations: ['ticketCategories'],
    });
    if (!event) throw new NotFoundException('Événement introuvable');
    return event;
  }

  async findOnePublic(id: string): Promise<Event> {
    const event = await this.findOne(id);
    if (event.status !== EventStatus.PUBLISHED) {
      throw new NotFoundException('Événement introuvable');
    }
    return event;
  }

  async create(dto: CreateEventDto): Promise<Event> {
    if (!dto.ticketCategories || dto.ticketCategories.length === 0) {
      throw new BadRequestException(
        'Au moins une catégorie de billet est requise',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const event = manager.create(Event, {
        title: dto.title,
        description: dto.description ?? null,
        category: dto.category,
        date: new Date(dto.date),
        venue: dto.venue,
        venueAddress: dto.venueAddress ?? null,
        imageUrl: dto.imageUrl ?? null,
        transportPrice: dto.transportPrice,
        parkingPrice: dto.parkingPrice,
        status: dto.status ?? EventStatus.DRAFT,
      });
      const saved = await manager.save(event);

      const cats = dto.ticketCategories.map((c, i) =>
        manager.create(EventTicketCategory, {
          eventId: saved.id,
          name: c.name,
          description: c.description ?? null,
          price: c.price,
          totalSeats: c.totalSeats,
          availableSeats: c.totalSeats,
          color: c.color ?? '#009E49',
          sortOrder: c.sortOrder ?? i,
          isActive: true,
        }),
      );
      await manager.save(cats);

      return this.findOne(saved.id);
    });
  }

  async update(id: string, dto: UpdateEventDto): Promise<Event> {
    const event = await this.findOne(id);

    if (dto.title !== undefined) event.title = dto.title;
    if (dto.description !== undefined) event.description = dto.description;
    if (dto.category !== undefined) event.category = dto.category;
    if (dto.date !== undefined) event.date = new Date(dto.date);
    if (dto.venue !== undefined) event.venue = dto.venue;
    if (dto.venueAddress !== undefined) event.venueAddress = dto.venueAddress;
    if (dto.imageUrl !== undefined) event.imageUrl = dto.imageUrl;
    if (dto.transportPrice !== undefined)
      event.transportPrice = dto.transportPrice;
    if (dto.parkingPrice !== undefined)
      event.parkingPrice = dto.parkingPrice;
    if (dto.status !== undefined) event.status = dto.status;

    await this.eventsRepo.save(event);
    return this.findOne(id);
  }

  async updateStatus(id: string, status: EventStatus): Promise<Event> {
    const event = await this.findOne(id);
    event.status = status;
    await this.eventsRepo.save(event);
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ message: string }> {
    const event = await this.findOne(id);
    await this.eventsRepo.remove(event);
    return { message: 'Événement supprimé' };
  }

  async getCategoriesPublic(eventId: string): Promise<EventTicketCategory[]> {
    return this.categoriesRepo.find({
      where: { eventId, isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async getCategoriesAdmin(eventId: string): Promise<EventTicketCategory[]> {
    return this.categoriesRepo.find({
      where: { eventId },
      order: { sortOrder: 'ASC' },
    });
  }
}
