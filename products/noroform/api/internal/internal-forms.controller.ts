import { Body, Controller, Get, Ip, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ProductModule } from '../access';
import { SubmitAnswersDto } from '../public/dto';
import { InternalFormsService } from './internal-forms.service';

/** اجرای فرم داخلی؛ نشست لازم است، tenant از عضویت همان فرم پیدا می‌شود. */
@Controller('noroform/internal/forms')
@ProductModule()
export class InternalFormsController {
  constructor(private readonly internalForms: InternalFormsService) {}

  @Get(':id')
  read(@Param('id', ParseUUIDPipe) id: string) {
    return this.internalForms.read(id);
  }

  @Post(':id/submissions')
  submit(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SubmitAnswersDto, @Ip() ip: string | undefined) {
    return this.internalForms.submit(id, dto, ip);
  }
}
