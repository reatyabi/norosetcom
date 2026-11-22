import './config/env';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import { MAX_UPLOAD_BYTES } from '@noroset/norofile';
import { AppModule } from './app.module';
import { isCsrfRejected } from './config/csrf';
import { parseTrustProxy } from './config/http';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // Fastify تعداد hop (عدد) را در runtime می‌پذیرد ولی در تایپ‌هایش نیامده.
    new FastifyAdapter({ trustProxy: parseTrustProxy() as boolean | string[] }),
  );

  await app.register(helmet);
  await app.register(cookie);

  // آپلود فایل (norofile و تصویر نورولینک) بدنه‌ی خام است (بدون multipart)؛ نوع واقعی از محتوا
  // تشخیص داده می‌شود و سقف دقیق هر مسیر در سرویس اعمال می‌شود.
  app
    .getHttpAdapter()
    .getInstance()
    .addContentTypeParser(
      /^(image\/[a-z0-9.+-]+|application\/(octet-stream|pdf|zip|vnd\.openxmlformats-officedocument\.[a-z.]+))$/,
      { parseAs: 'buffer', bodyLimit: MAX_UPLOAD_BYTES },
      (_req, body, done) => done(null, body),
    );

  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onRequest', (req, reply, done) => {
      const rejected = isCsrfRejected({ method: req.method, path: req.url, origin: req.headers.origin, cookie: req.headers.cookie });
      if (rejected) void reply.code(403).send({ statusCode: 403, message: 'invalid_origin' });
      else done();
    });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.PORT ?? 3001);
  // production: HOST=127.0.0.1 تا فقط از پشت nginx در دسترس باشد.
  await app.listen(port, process.env.HOST ?? '0.0.0.0');
  console.log(`noroset-api listening on http://localhost:${port}`);
}

void bootstrap();

