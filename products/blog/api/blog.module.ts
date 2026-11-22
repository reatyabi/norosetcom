import { Module } from '@nestjs/common';
import { AdminCommentsService } from './comments.service';
import { AdminBlogController, PublicBlogController } from './controllers';
import { AdminPostsService } from './posts.service';
import { PublicBlogService } from './public.service';
import { AdminTermsService } from './terms.service';

/**
 * ماژول API بلاگ (docs/architecture.md §9.12). PLATFORM_ADMIN_CONTEXT، RATE_LIMITER و IP_HASHER را apps/api و
 * FILE_SERVICE را norofile (ماژول‌های سراسری) فراهم می‌کنند؛ blog فقط Port core را می‌شناسد.
 */
@Module({
  controllers: [AdminBlogController, PublicBlogController],
  providers: [AdminPostsService, AdminTermsService, AdminCommentsService, PublicBlogService],
})
export class BlogModule {}
