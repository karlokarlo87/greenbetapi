import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

const cors = require('cors');
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // Enable validation pipes globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const corsOptions = {
    origin: [
      'http://localhost:3000',
    ],
    credentials: true,
    optionSuccessStatus: 200,
  };
  app.use(cors(corsOptions));
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
