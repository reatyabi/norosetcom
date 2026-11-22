import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import type { Readable } from 'node:stream';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

// تنها کلاینت S3 پلتفرم (docs/architecture.md §9.9). bucket خصوصی است: مرورگر هرگز مستقیم از bucket
// نمی‌خواند و همه‌ی فایل‌ها از مسیر API norofile (با بررسی دسترسی) سرو می‌شوند.

/** توکن DI ذخیره‌ساز شیء (در تست با نسخه‌ی حافظه‌ای جایگزین می‌شود). */
export const OBJECT_STORAGE = Symbol.for('noroset:norofile:ObjectStorage');

export interface StoredObject {
  body: Readable | Uint8Array;
  contentLength: number | undefined;
}

export interface ObjectStorage {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  /** کپی سمت ذخیره‌ساز، بدون آوردن فایل به حافظه‌ی API. */
  delete(key: string): Promise<void>;
}

type Env = Record<string, string | undefined>;

export interface S3Config {
  endpoint: string | undefined;
  region: string;
  bucket: string;
  accessKeyId: string | undefined;
  secretAccessKey: string | undefined;
  /** فقط development: bucket هنگام بوت ساخته می‌شود (بدون دسترسی عمومی). */
  createBucket: boolean;
}

export function s3Config(env: Env = process.env): S3Config {
  return {
    endpoint: env.S3_ENDPOINT || undefined,
    region: env.S3_REGION ?? 'us-east-1',
    bucket: env.S3_BUCKET ?? 'noroset-files',
    accessKeyId: env.S3_ACCESS_KEY_ID || undefined,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY || undefined,
    createBucket: env.S3_CREATE_BUCKET === 'true',
  };
}

@Injectable()
export class S3ObjectStorage implements ObjectStorage, OnModuleInit {
  private readonly logger = new Logger(S3ObjectStorage.name);
  private readonly config = s3Config();
  private readonly client = new S3Client({
    endpoint: this.config.endpoint,
    region: this.config.region,
    forcePathStyle: true,
    credentials:
      this.config.accessKeyId && this.config.secretAccessKey
        ? { accessKeyId: this.config.accessKeyId, secretAccessKey: this.config.secretAccessKey }
        : { accessKeyId: 'dev', secretAccessKey: 'dev' },
  });

  async onModuleInit(): Promise<void> {
    if (!this.config.createBucket) return;
    const Bucket = this.config.bucket;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket }));
        this.logger.log(`created bucket ${Bucket}`);
      } catch (err) {
        this.logger.warn(`could not prepare bucket ${Bucket}: ${(err as Error).message}`);
      }
    }
  }

  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: this.config.bucket, Key: key, Body: body, ContentType: contentType }));
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: key }));
      if (!res.Body) return null;
      return { body: res.Body as Readable, contentLength: res.ContentLength };
    } catch (err) {
      if ((err as { name?: string }).name === 'NoSuchKey') return null;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
  }
}
