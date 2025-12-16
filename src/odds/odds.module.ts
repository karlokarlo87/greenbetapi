import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OddsService } from './odds.service';
import { OddsController } from './odds.controller';
import { Odd } from './odd.entity';
import { LeaguesModule } from '../leagues/leagues.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Odd]),
    LeaguesModule,
  ],
  providers: [OddsService],
  controllers: [OddsController],
  exports: [OddsService],
})
export class OddsModule {}
