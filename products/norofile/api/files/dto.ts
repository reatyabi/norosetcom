import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import type { FileKind, FileVisibility } from '@noroset/core';
import { LIST_LIMIT } from '../limits';
import type { FileOwnerFilter, FileSort } from './files.service';

const KINDS: FileKind[] = ['image', 'document', 'archive'];
const VISIBILITIES: FileVisibility[] = ['private', 'public'];

export class ListFilesQuery {
  @IsOptional()
  @IsIn(KINDS)
  kind?: FileKind;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(['me', 'others'])
  owner?: FileOwnerFilter;

  @IsOptional()
  @IsIn(['created', 'updated', 'name'])
  sort?: FileSort;

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

export class UploadQuery {
  @IsOptional()
  @IsIn(VISIBILITIES)
  visibility?: FileVisibility;
}

export class UpdateFileDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsIn(VISIBILITIES)
  visibility?: FileVisibility;
}

export class ContentQuery {
  @IsOptional()
  @IsIn(['1'])
  download?: '1';
}
