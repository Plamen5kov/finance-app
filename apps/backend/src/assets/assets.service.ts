import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.asset.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: { snapshots: { orderBy: { capturedAt: 'desc' }, take: 24 } },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.userId !== userId) throw new ForbiddenException();
    return asset;
  }

  async create(userId: string, dto: CreateAssetDto) {
    return this.prisma.asset.create({ data: { userId, ...dto } });
  }

  async update(userId: string, id: string, dto: Partial<CreateAssetDto>) {
    await this.assertOwner(userId, id);
    return this.prisma.asset.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.asset.delete({ where: { id } });
  }

  async getNetWorth(userId: string) {
    const assets = await this.prisma.asset.findMany({ where: { userId } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const total = assets.reduce((sum: number, a: any) => sum + (a.value as number), 0);
    return { total, assets };
  }

  private async assertOwner(userId: string, assetId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.userId !== userId) throw new ForbiddenException();
    return asset;
  }
}
