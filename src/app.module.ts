import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SportsModule } from './sports/sports.module';
import { LeaguesModule } from './leagues/leagues.module';
import { OddsModule } from './odds/odds.module';
import * as redisStore from 'cache-manager-redis-store';
@Module({
  imports: [
    ScheduleModule.forRoot(),
    SportsModule, LeaguesModule, OddsModule,
    ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
