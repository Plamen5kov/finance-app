import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user + household + membership in a single transaction
    const { user, household } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: dto.name, email: dto.email, password: hashedPassword },
      });

      const household = await tx.household.create({
        data: {
          name: dto.name ? `${dto.name}'s Household` : 'My Household',
          members: { create: { userId: user.id, role: 'owner' } },
        },
      });

      // Create default expense categories for the new household
      const defaultCategories = [
        { name: 'Salary / Income', color: '#10B981', type: 'income' },
        { name: 'Housing', color: '#6366F1', type: 'required' },
        { name: 'Utilities', color: '#8B5CF6', type: 'required' },
        { name: 'Groceries', color: '#F59E0B', type: 'required' },
        { name: 'Transport', color: '#3B82F6', type: 'expense' },
        { name: 'Dining Out', color: '#EF4444', type: 'expense' },
        { name: 'Entertainment', color: '#EC4899', type: 'expense' },
        { name: 'Healthcare', color: '#14B8A6', type: 'expense' },
        { name: 'Shopping', color: '#F97316', type: 'expense' },
        { name: 'Subscriptions', color: '#A855F7', type: 'expense' },
        { name: 'Insurance', color: '#64748B', type: 'required' },
        { name: 'Education', color: '#06B6D4', type: 'expense' },
        { name: 'Travel', color: '#84CC16', type: 'expense' },
        { name: 'Other', color: '#6B7280', type: 'expense' },
      ];
      await tx.expenseCategory.createMany({
        data: defaultCategories.map((c) => ({
          ...c,
          userId: user.id,
          householdId: household.id,
        })),
      });

      return { user, household };
    });

    const tokens = await this.generateTokens(user.id, user.email, household.id);
    return { user: { id: user.id, name: user.name, email: user.email }, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    });

    // Get the user's first household (for now, users have one household)
    const membership = await this.prisma.householdMember.findFirst({
      where: { userId: user.id },
    });
    if (!membership) throw new UnauthorizedException('User has no household');

    const tokens = await this.generateTokens(user.id, user.email, membership.householdId);
    return { user: { id: user.id, name: user.name, email: user.email }, ...tokens };
  }

  async generateTokens(userId: string, email: string, householdId: string) {
    const payload = { sub: userId, email, householdId };

    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get('jwt.expiration'),
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get('jwt.refreshExpiration'),
    });

    return { accessToken, refreshToken };
  }

  async refreshToken(userId: string, email: string, householdId: string) {
    return this.generateTokens(userId, email, householdId);
  }
}
