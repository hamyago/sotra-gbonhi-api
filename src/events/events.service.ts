import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
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
  ) {}

  async findAll(): Promise<Event[]> {
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

  async create(dto: CreateEventDto): Promise<Event> {
    // Vérifier qu'il y a au moins une catégorie
    if (!dto.ticketCategories || dto.ticketCategories.length === 0) {
      throw new NotFoundException('Au moins une catégorie de billet est requise');
    }

    // Créer l'événement
    const event = this.eventsRepo.create({
      title: dto.title,
      description: dto.description ?? null,
      category: dto.category,
      date: new Date(dto.date),
      venue: dto.venue,
      venueAddress: dto.venueAddress ?? null,
      imageUrl: dto.imageUrl ?? null,
      transportPrice: dto.transportPrice,
      parkingPrice: dto.parkingPrice,
      status: dto.status ?? 'DRAFT',
    });
    const saved = await this.eventsRepo.save(event);

    // Créer les catégories
    for (let i = 0; i < dto.ticketCategories.length; i++) {
      const catDto = dto.ticketCategories[i];
      const cat = this.categoriesRepo.create({
        eventId: saved.id,
        name: catDto.name,
        description: catDto.description ?? null,
        price: catDto.price,
        totalSeats: catDto.totalSeats,
        availableSeats: catDto.totalSeats,
        color: catDto.color ?? '#009E49',
        sortOrder: catDto.sortOrder ?? i,
        isActive: true,
      });
      await this.categoriesRepo.save(cat);
    }

    return this.findOne(saved.id);
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
    if (dto.transportPrice !== undefined) event.transportPrice = dto.transportPrice;
    if (dto.parkingPrice !== undefined) event.parkingPrice = dto.parkingPrice;
    if (dto.status !== undefined) event.status = dto.status;

    await this.eventsRepo.save(event);
    return this.findOne(id);
  }

  async updateStatus(id: string, status: string): Promise<Event> {
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

  async getCategories(eventId: string): Promise<EventTicketCategory[]> {
    return this.categoriesRepo.find({
      where: { eventId },
      order: { sortOrder: 'ASC' },
    });
  }
}
