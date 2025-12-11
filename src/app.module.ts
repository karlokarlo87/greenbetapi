import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SportsModule } from './sports/sports.module';
import { LeaguesModule } from './leagues/leagues.module';
import { CacheModule } from '@nestjs/cache-manager';
import { OddsModule } from './odds/odds.module';
import * as redisStore from 'cache-manager-redis-store';
@Module({
  imports: [
    ScheduleModule.forRoot(),
    SportsModule, LeaguesModule, OddsModule,
    CacheModule.register({
      store: redisStore,
      host: '127.0.0.1',
      port: 3002,
      ttl: 600000,
    }),
    ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
