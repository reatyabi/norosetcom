import { Body, Controller, Get, Ip, Param, Post } from '@nestjs/common';
import { ProductModule, Public } from '../access';
import { SubmitAnswersDto } from './dto';
import { PublicFormsService } from './public-forms.service';

/** routeهای عمومی (بدون نشست و بدون tenant در هدر؛ tenant از slug فرم پیدا می‌شود). */
@Controller('noroform/public/forms')
@ProductModule()
@Public()
export class PublicFormsController {
  constructor(private readonly publicForms: PublicFormsService) {}

  @Get(':slug')
  read(@Param('slug') slug: string, @Ip() ip: string | undefined) {
    return this.publicForms.read(slug, ip);
  }

  @Post(':slug/submissions')
  submit(@Param('slug') slug: string, @Body() dto: SubmitAnswersDto, @Ip() ip: string | undefined) {
    return this.publicForms.submit(slug, dto, ip);
  }
}
