import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Tanpa URI versioning untuk MVP — semua route ada langsung di /api/*
  // (mis. /api/areas), sesuai kontrak yang dipakai frontend (VITE_API_BASE_URL=.../api).
  // Tambahkan app.enableVersioning() lagi nanti kalau memang dibutuhkan breaking change API.
  app.setGlobalPrefix('api');

  // Dibutuhkan untuk baca cookie httpOnly refresh token di AuthController
  // (req.cookies) — lihat modules/auth.
  app.use(cookieParser());

  // credentials:true WAJIB untuk refresh token cookie ikut terkirim
  // cross-origin (frontend & backend beda subdomain Railway); origin TIDAK
  // boleh '*' selama credentials true (browser menolaknya).
  app.enableCors({
    origin: config.get<string>('corsOrigin'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  // Urutan penting: ResponseTransformInterceptor di luar, AuditLogInterceptor
  // di dalam — supaya AuditLogInterceptor sempat baca hasil mentah controller
  // (mis. { id, ... }) sebelum dibungkus jadi { data: ... }. (Ekstraksi id di
  // AuditLogInterceptor tetap dibuat toleran ke kedua bentuk, jaga-jaga.)
  app.useGlobalInterceptors(
    new ResponseTransformInterceptor(),
    new AuditLogInterceptor(app.get(PrismaService), app.get(Reflector)),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Instrument Maintenance Monitoring System API')
    .setDescription('REST API untuk monitoring & pengelolaan maintenance instrumentasi')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`IMMS backend running on :${port} — Swagger at /api/docs`);
}

bootstrap();
