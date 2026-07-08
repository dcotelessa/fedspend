import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { types } from 'pg';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { AppModule } from './app.module';

types.setTypeParser(types.builtins.INT8, (value: string) => Number(value));

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
  });
  app.setGlobalPrefix('api', { exclude: ['health'] });

  const clientPath = join(process.cwd(), 'frontend', 'dist', 'frontend', 'browser');
  if (existsSync(clientPath)) {
    app.useStaticAssets(clientPath);
    const indexHtml = readFileSync(join(clientPath, 'index.html'), 'utf-8');
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (
        req.method === 'GET' &&
        !req.path.startsWith('/api') &&
        !req.path.startsWith('/health') &&
        !req.path.match(/\.[a-zA-Z0-9]+$/)
      ) {
        return res.type('text/html').send(indexHtml);
      }
      next();
    });
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
