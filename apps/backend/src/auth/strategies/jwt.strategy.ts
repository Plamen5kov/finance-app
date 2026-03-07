import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret')!,
    });
  }

  async validate(payload: { sub: string; email: string; householdId: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();

    // Verify household membership
    const membership = await this.prisma.householdMember.findUnique({
      where: { userId_householdId: { userId: payload.sub, householdId: payload.householdId } },
    });
    if (!membership) throw new UnauthorizedException('Not a member of this household');

    return { userId: payload.sub, email: payload.email, householdId: payload.householdId };
  }
}
