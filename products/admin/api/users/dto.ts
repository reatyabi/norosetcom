import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import type { PlatformRole } from '@noroset/core';
import { LIST_LIMIT } from '../access';

export type UserStatus = 'active' | 'disabled' | 'blocked';

export const USER_STATUSES: UserStatus[] = ['active', 'disabled', 'blocked'];
export const PLATFORM_ROLES: PlatformRole[] = ['user', 'superadmin'];

export class PageQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LIST_LIMIT.max)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class ListUsersQuery extends PageQuery {
  /** موبایل (هر قالب)، نام یا ایمیل. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(USER_STATUSES)
  status?: UserStatus;

  @IsOptional()
  @IsIn(PLATFORM_ROLES)
  role?: PlatformRole;
}

export class NewTenantDto {
  @IsString()
  @MaxLength(512)
  name!: string;

  @IsString()
  @MaxLength(64)
  slug!: string;
}

export class CreateUserDto {
  @IsString()
  @MaxLength(32)
  mobile!: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  password?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NewTenantDto)
  tenant?: NewTenantDto;
}

export class UpdateUserDto {
  @IsString()
  @MaxLength(512)
  fullName!: string;
}

export class SetStatusDto {
  @IsIn(USER_STATUSES)
  status!: UserStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class SetRoleDto {
  @IsIn(PLATFORM_ROLES)
  platformRole!: PlatformRole;
}

export class SetPasswordDto {
  @IsString()
  @MaxLength(256)
  newPassword!: string;
}
