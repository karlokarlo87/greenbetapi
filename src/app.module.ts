import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SportsModule } from './sports/sports.module';

@Module({
  imports: [ScheduleModule.forRoot(), SportsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
