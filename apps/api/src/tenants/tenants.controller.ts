import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly cls: ClsService,
    private readonly tenants: TenantsService,
  ) {}

  @Post()
  async create(@Body() dto: CreateTenantDto) {
    const userId = this.cls.get<string>('userId');
    return this.tenants.create(userId, dto.name, dto.slug);
  }

  @Post('default')
  @HttpCode(200)
  ensureDefault() {
    return this.tenants.ensureDefault(this.cls.get<string>('userId'));
  }
}
