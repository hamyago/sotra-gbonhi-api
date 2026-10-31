import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findAll(search?: string, role?: UserRole): Promise<User[]> {
    const where: any = {};
    if (search) where.phone = Like(`%${search}%`);
    if (role) where.role = role;
    return this.usersRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepository.findOne({ where: { phone: dto.phone } });
    if (existing) {
      existing.role = dto.role;
      if (dto.name) existing.name = dto.name;
      return this.usersRepository.save(existing);
    }

    const user = this.usersRepository.create({
      phone: dto.phone,
      name: dto.name ?? null,
      role: dto.role,
      isVerified: false,
    });
    return this.usersRepository.save(user);
  }

  async updateRole(id: string, dto: UpdateUserRoleDto): Promise<User> {
    const user = await this.findOne(id);

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Impossible de modifier un SUPER_ADMIN');
    }

    user.role = dto.role;
    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<{ message: string }> {
    const user = await this.findOne(id);
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Impossible de supprimer un SUPER_ADMIN');
    }
    await this.usersRepository.remove(user);
    return { message: 'Utilisateur supprimé' };
  }
}
