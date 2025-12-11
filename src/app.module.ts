import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SportsModule } from './sports/sports.module';
import { LeaguesModule } from './leagues/leagues.module';

@Module({
  imports: [ScheduleModule.forRoot(), SportsModule, LeaguesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
