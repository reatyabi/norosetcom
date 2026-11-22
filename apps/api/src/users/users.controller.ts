import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UnauthorizedException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { IsString, MaxLength } from 'class-validator';
import {
  and,
  db,
  desc,
  eq,
  gte,
  isNull,
  platformUsers,
  supportAccessGrants,
  supportGrantStatus,
  tenantMemberships,
  tenants,
  withUser,
} from '@noroset/core';
import { NotInSupport } from '../auth/decorators/support.decorator';
import type { SupportSession } from '../auth/support-session.service';
import { ProfileService } from './profile.service';

export class UpdateProfileDto {
  @IsString()
  @MaxLength(512)
  fullName!: string;
}

function decodeName(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return undefined;
  }
}

@Controller()
export class UsersController {
  constructor(
    private readonly cls: ClsService,
    private readonly profile: ProfileService,
  ) {}

  @Get('me')
  async me() {
    const userId = this.userId();

    const user = (
      await db.select().from(platformUsers).where(eq(platformUsers.id, userId)).limit(1)
    )[0];
    if (!user) throw new UnauthorizedException();

    const memberships = await withUser(userId, (tx) =>
      tx
        .select({
          tenantId: tenantMemberships.tenantId,
          role: tenantMemberships.role,
          slug: tenants.slug,
          name: tenants.name,
        })
        .from(tenantMemberships)
        .innerJoin(tenants, eq(tenantMemberships.tenantId, tenants.id))
        .where(eq(tenantMemberships.status, 'active')),
    );

    return {
      id: user.id,
      mobile: user.mobile,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: this.profile.avatarUrl(user.avatarFileId),
      // خود هش هرگز برنمی‌گردد.
      hasPassword: user.passwordHash !== null,
      platformRole: user.platformRole,
      // نشست پشتیبانی: ادمین داخل این حساب است (وب بنر نشان می‌دهد؛ docs/architecture.md §9.11).
      support: this.supportInfo(),
      memberships,
    };
  }

  @Patch('me')
  update(@Body() dto: UpdateProfileDto) {
    return this.profile.updateName(this.userId(), dto.fullName);
  }

  /** بدنه‌ی خام تصویر (نوع واقعی از محتوا)؛ نام اختیاری در هدر `X-File-Name`. */
  @Put('me/avatar')
  setAvatar(@Body() body: unknown, @Headers('x-file-name') name: string | undefined) {
    return this.profile.setAvatar(this.userId(), body, decodeName(name));
  }

  @Delete('me/avatar')
  @HttpCode(204)
  async removeAvatar() {
    await this.profile.removeAvatar(this.userId());
  }

  /** سابقه‌ی دسترسی‌های پشتیبانی به همین حساب (زمان، مدت، دلیل؛ نام ادمین نه). */
  @Get('me/support-access')
  async supportAccess() {
    const userId = this.userId();
    const rows = await withUser(userId, (tx) =>
      tx
        .select({
          id: supportAccessGrants.id,
          reason: supportAccessGrants.reason,
          createdAt: supportAccessGrants.createdAt,
          expiresAt: supportAccessGrants.expiresAt,
          redeemedAt: supportAccessGrants.redeemedAt,
          endedAt: supportAccessGrants.endedAt,
          revokedAt: supportAccessGrants.revokedAt,
          revokedBy: supportAccessGrants.revokedBy,
        })
        .from(supportAccessGrants)
        .where(eq(supportAccessGrants.userId, userId))
        .orderBy(desc(supportAccessGrants.createdAt))
        .limit(50),
    );
    const now = new Date();
    return rows.map((g) => ({
      ...g,
      status: supportGrantStatus(g, now),
      minutes: Math.round((g.expiresAt.getTime() - g.createdAt.getTime()) / 60_000),
    }));
  }

  /** کاربر دسترسی فعال یا مصرف‌نشده را باطل می‌کند؛ نشست پشتیبانی در درخواست بعدی رد می‌شود. */
  @Post('me/support-access/:id/revoke')
  @HttpCode(200)
  @NotInSupport()
  async revokeSupportAccess(@Param('id', ParseUUIDPipe) id: string) {
    const userId = this.userId();
    const revoked = await withUser(userId, (tx) =>
      tx
        .update(supportAccessGrants)
        .set({ revokedAt: new Date(), revokedBy: 'user' })
        .where(
          and(
            eq(supportAccessGrants.id, id),
            isNull(supportAccessGrants.revokedAt),
            isNull(supportAccessGrants.endedAt),
            gte(supportAccessGrants.expiresAt, new Date()),
          ),
        )
        .returning({ id: supportAccessGrants.id }),
    );
    if (!revoked[0]) throw new NotFoundException('not_found');
    return { ok: true };
  }

  private supportInfo() {
    const session = this.cls.get<SupportSession | undefined>('support');
    return session ? { grantId: session.grantId, expiresAt: session.expiresAt } : null;
  }

  private userId(): string {
    const userId = this.cls.get<string>('userId');
    if (!userId) throw new UnauthorizedException();
    return userId;
  }
}
