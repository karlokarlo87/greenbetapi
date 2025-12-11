import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SportsModule } from './sports/sports.module';

@Module({
  imports: [SportsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
