import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class HouseholdService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private authService: AuthService,
  ) {}

  async createInvite(userId: string, householdId: string, role: string = 'member') {
    const VALID_ROLES = ['member', 'viewer'];
    if (!VALID_ROLES.includes(role)) {
      throw new BadRequestException(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
    }

    // Verify user is owner
    const membership = await this.prisma.householdMember.findUnique({
      where: { userId_householdId: { userId, householdId } },
    });
    if (!membership || membership.role !== 'owner') {
      throw new ForbiddenException('Only the household owner can create invites');
    }

    // Limit active invites
    const activeCount = await this.prisma.householdInvite.count({
      where: { householdId, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (activeCount >= 3) {
      throw new BadRequestException('Maximum 3 active invites allowed. Revoke one first.');
    }

    const invite = await this.prisma.householdInvite.create({
      data: {
        householdId,
        createdById: userId,
        role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    return {
      id: invite.id,
      token: invite.token,
      role: invite.role,
      link: `${frontendUrl}/invite/${invite.token}`,
      expiresAt: invite.expiresAt,
    };
  }

  async listInvites(userId: string, householdId: string) {
    const membership = await this.prisma.householdMember.findUnique({
      where: { userId_householdId: { userId, householdId } },
    });
    if (!membership || membership.role !== 'owner') {
      throw new ForbiddenException('Only the household owner can view invites');
    }

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const invites = await this.prisma.householdInvite.findMany({
      where: { householdId, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    return invites.map((inv) => ({
      id: inv.id,
      token: inv.token,
      role: inv.role,
      link: `${frontendUrl}/invite/${inv.token}`,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    }));
  }

  async revokeInvite(userId: string, householdId: string, inviteId: string) {
    const membership = await this.prisma.householdMember.findUnique({
      where: { userId_householdId: { userId, householdId } },
    });
    if (!membership || membership.role !== 'owner') {
      throw new ForbiddenException('Only the household owner can revoke invites');
    }

    const invite = await this.prisma.householdInvite.findFirst({
      where: { id: inviteId, householdId },
    });
    if (!invite) throw new NotFoundException('Invite not found');

    await this.prisma.householdInvite.delete({ where: { id: inviteId } });
  }

  async getInviteInfo(token: string) {
    const invite = await this.prisma.householdInvite.findUnique({
      where: { token },
      include: {
        household: { select: { name: true } },
      },
    });

    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.usedAt) throw new BadRequestException('This invite has already been used');
    if (invite.expiresAt < new Date()) throw new BadRequestException('This invite has expired');

    // Get inviter name
    const inviter = await this.prisma.user.findUnique({
      where: { id: invite.createdById },
      select: { name: true },
    });

    return {
      householdName: invite.household.name,
      invitedBy: inviter?.name ?? 'Unknown',
      role: invite.role,
      expiresAt: invite.expiresAt,
    };
  }

  async acceptInvite(token: string, userId: string, email: string) {
    return this.prisma.$transaction(async (tx) => {
      // Atomic claim: updateMany with conditions prevents double-use race conditions.
      // If two requests race, only one gets count=1; the other gets count=0.
      const now = new Date();
      const claimed = await tx.householdInvite.updateMany({
        where: { token, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now, usedById: userId },
      });

      if (claimed.count === 0) {
        const existing = await tx.householdInvite.findUnique({ where: { token } });
        if (!existing) throw new NotFoundException('Invite not found');
        if (existing.usedAt) throw new BadRequestException('This invite has already been used');
        throw new BadRequestException('This invite has expired');
      }

      // Re-fetch to get householdId and role (updateMany doesn't return the record)
      const invite = await tx.householdInvite.findUnique({
        where: { token },
        select: { householdId: true, role: true },
      });
      if (!invite) throw new NotFoundException('Invite not found');

      // Check not already a member
      const existing = await tx.householdMember.findUnique({
        where: {
          userId_householdId: { userId, householdId: invite.householdId },
        },
      });
      if (existing) throw new BadRequestException('You are already a member of this household');

      // Get user's current household
      const oldMembership = await tx.householdMember.findFirst({
        where: { userId },
      });

      // Create new membership with the role specified in the invite
      await tx.householdMember.create({
        data: { userId, householdId: invite.householdId, role: invite.role },
      });

      // Remove old membership and clean up empty household
      if (oldMembership && oldMembership.householdId !== invite.householdId) {
        await tx.householdMember.delete({ where: { id: oldMembership.id } });

        const remainingMembers = await tx.householdMember.count({
          where: { householdId: oldMembership.householdId },
        });
        if (remainingMembers === 0) {
          await tx.household.delete({ where: { id: oldMembership.householdId } });
        }
      }

      // Generate new tokens with updated householdId
      const tokens = await this.authService.generateTokens(userId, email, invite.householdId);
      return tokens;
    });
  }

  async updateMemberRole(userId: string, householdId: string, memberId: string, role: string) {
    const VALID_ROLES = ['member', 'viewer'];

    // Verify caller is owner
    const callerMembership = await this.prisma.householdMember.findUnique({
      where: { userId_householdId: { userId, householdId } },
    });
    if (!callerMembership || callerMembership.role !== 'owner') {
      throw new ForbiddenException('Only the household owner can change roles');
    }

    if (!VALID_ROLES.includes(role)) {
      throw new BadRequestException(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
    }

    const target = await this.prisma.householdMember.findFirst({
      where: { id: memberId, householdId },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'owner') {
      throw new ForbiddenException('Cannot change the owner role');
    }

    const updated = await this.prisma.householdMember.update({
      where: { id: memberId },
      data: { role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return {
      id: updated.id,
      userId: updated.user.id,
      name: updated.user.name,
      email: updated.user.email,
      role: updated.role,
    };
  }

  async removeMember(userId: string, householdId: string, memberId: string) {
    const callerMembership = await this.prisma.householdMember.findUnique({
      where: { userId_householdId: { userId, householdId } },
    });
    if (!callerMembership || callerMembership.role !== 'owner') {
      throw new ForbiddenException('Only the household owner can remove members');
    }

    const target = await this.prisma.householdMember.findFirst({
      where: { id: memberId, householdId },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'owner') {
      throw new ForbiddenException('Cannot remove the household owner');
    }

    await this.prisma.householdMember.delete({ where: { id: memberId } });
  }

  async listMembers(householdId: string) {
    const members = await this.prisma.householdMember.findMany({
      where: { householdId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      joinedAt: m.createdAt,
    }));
  }
}
