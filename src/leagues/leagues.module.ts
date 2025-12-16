import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { LeaguesController } from './leagues.controller';
import { LeaguesService } from './leagues.service';
import { SportsModule } from '../sports/sports.module';
import { League } from './league.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([League]),
    CacheModule.register({
      ttl: 600000, // 10 minutes in milliseconds
      max: 100, // maximum number of items in cache
    }),
    SportsModule,
  ],
  controllers: [LeaguesController],
  providers: [LeaguesService],
})
export class LeaguesModule {}
