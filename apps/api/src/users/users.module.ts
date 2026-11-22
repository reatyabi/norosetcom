import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UsersController } from './users.controller';

// FILE_SERVICE را NorofileModule (سراسری) فراهم می‌کند.
@Module({
  controllers: [UsersController],
  providers: [ProfileService],
})
export class UsersModule {}
