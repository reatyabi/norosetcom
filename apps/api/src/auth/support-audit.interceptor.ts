import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { from, switchMap, type Observable } from 'rxjs';
import { SupportSessionService, type SupportSession } from './support-session.service';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * هر درخواست تغییردهنده در نشست پشتیبانی پیش از اجرا با هویت ادمین در لاگ ممیزی ثبت می‌شود
 * (docs/architecture.md §9.11)؛ اگر ثبت نشود درخواست هم اجرا نمی‌شود. فقط الگوی route (نه query یا بدنه).
 */
@Injectable()
export class SupportAuditInterceptor implements NestInterceptor {
  constructor(
    private readonly cls: ClsService,
    private readonly support: SupportSessionService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const session = this.cls.get<SupportSession | undefined>('support');
    const req = context.switchToHttp().getRequest<{ method: string; url: string; routeOptions?: { url?: string }; headers: Record<string, unknown> }>();
    if (!session || READ_METHODS.has(req.method)) return next.handle();
    const tenant = req.headers['x-tenant-id'];
    const details = {
      method: req.method,
      route: req.routeOptions?.url ?? req.url.split('?')[0] ?? '',
      tenantId: typeof tenant === 'string' ? tenant : null,
    };
    return from(this.support.auditRequest(session, details, this.cls.get<string | null>('ip') ?? null)).pipe(switchMap(() => next.handle()));
  }
}
