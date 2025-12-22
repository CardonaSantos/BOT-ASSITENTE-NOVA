import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // comentario
  app.enableCors({
    origin: true, // permite cualquier origen dinámicamente
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  await app.listen(process.env.PORT || 4000);
}
bootstrap();
///
// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   // comentario
//   app.enableCors({
//     origin: [
//       'http://localhost:5173',
//       'https://farmacia-botiquin.up.railway.app',
//     ],
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//   });

//   await app.listen(process.env.PORT || 3000);
// }
// bootstrap();
