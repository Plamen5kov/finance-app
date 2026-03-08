import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

@Injectable()
export class WriteAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const method = request.method?.toUpperCase();

    if (!WRITE_METHODS.has(method)) return true;

    const user = request.user;
    if (user?.role === 'viewer') {
      throw new ForbiddenException('Viewers have read-only access');
    }

    return true;
  }
}
