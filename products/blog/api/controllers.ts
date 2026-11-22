import { Body, Controller, Delete, Get, HttpCode, Ip, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Public, SuperAdmin } from './access';
import { AdminCommentsService } from './comments.service';
import {
  CategoryDto,
  CommentListQuery,
  CommentReplyDto,
  CommentStatusDto,
  CreatePostDto,
  PostListQuery,
  PublicCommentDto,
  PublicPostQuery,
  TagDto,
  UpdatePostDto,
} from './dto';
import { AdminPostsService } from './posts.service';
import { PublicBlogService } from './public.service';
import { AdminTermsService } from './terms.service';

/** نوشتن و مدیریت بلاگ (فقط superadmin؛ گارد در بک‌اند). */
@Controller('blog/admin')
@SuperAdmin()
export class AdminBlogController {
  constructor(
    private readonly posts: AdminPostsService,
    private readonly terms: AdminTermsService,
    private readonly comments: AdminCommentsService,
  ) {}

  @Get('posts')
  listPosts(@Query() query: PostListQuery) {
    return this.posts.list(query);
  }

  @Post('posts')
  createPost(@Body() dto: CreatePostDto) {
    return this.posts.create(dto);
  }

  @Get('posts/:id')
  getPost(@Param('id', ParseUUIDPipe) id: string) {
    return this.posts.get(id);
  }

  @Patch('posts/:id')
  updatePost(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePostDto) {
    return this.posts.update(id, dto);
  }

  @Post('posts/:id/publish')
  @HttpCode(200)
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.posts.publish(id);
  }

  @Post('posts/:id/unpublish')
  @HttpCode(200)
  unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.posts.unpublish(id);
  }

  @Delete('posts/:id')
  @HttpCode(204)
  async removePost(@Param('id', ParseUUIDPipe) id: string) {
    await this.posts.remove(id);
  }

  /** بدنه‌ی خام تصویر (تصویر شاخص و تصاویر متن). */
  @Post('uploads')
  upload(@Body() body: Buffer) {
    return this.posts.upload(body);
  }

  @Get('categories')
  categories() {
    return this.terms.categories();
  }

  @Post('categories')
  createCategory(@Body() dto: CategoryDto) {
    return this.terms.createCategory(dto);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CategoryDto) {
    return this.terms.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @HttpCode(204)
  async removeCategory(@Param('id', ParseUUIDPipe) id: string) {
    await this.terms.removeCategory(id);
  }

  @Get('tags')
  tags() {
    return this.terms.tags();
  }

  @Patch('tags/:id')
  updateTag(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TagDto) {
    return this.terms.updateTag(id, dto);
  }

  @Delete('tags/:id')
  @HttpCode(204)
  async removeTag(@Param('id', ParseUUIDPipe) id: string) {
    await this.terms.removeTag(id);
  }

  @Get('comments')
  listComments(@Query() query: CommentListQuery) {
    return this.comments.list(query);
  }

  @Post('comments/:id/status')
  @HttpCode(204)
  async setCommentStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CommentStatusDto) {
    await this.comments.setStatus(id, dto.status);
  }

  @Post('comments/:id/reply')
  reply(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CommentReplyDto) {
    return this.comments.reply(id, dto.body);
  }

  @Delete('comments/:id')
  @HttpCode(204)
  async removeComment(@Param('id', ParseUUIDPipe) id: string) {
    await this.comments.remove(id);
  }
}

/** بلاگ عمومی noroset.com/blog (بدون نشست). */
@Controller('blog/public')
@Public()
export class PublicBlogController {
  constructor(private readonly blog: PublicBlogService) {}

  @Get('posts')
  list(@Query() query: PublicPostQuery) {
    return this.blog.list(query);
  }

  @Get('posts/:slug')
  read(@Param('slug') slug: string) {
    return this.blog.read(slug);
  }

  @Post('posts/:slug/comments')
  comment(@Param('slug') slug: string, @Body() dto: PublicCommentDto, @Ip() ip: string | undefined) {
    return this.blog.comment(slug, dto, ip);
  }

  @Get('categories')
  categories() {
    return this.blog.categories();
  }

  @Get('tags/:slug')
  tag(@Param('slug') slug: string) {
    return this.blog.tag(slug);
  }

  @Get('sitemap')
  sitemap() {
    return this.blog.sitemap();
  }
}
