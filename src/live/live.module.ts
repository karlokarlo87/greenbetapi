import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveService } from './live.service';
import { LiveController } from './live.controller';
import { LiveMatch } from './live.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LiveMatch])],
  providers: [LiveService],
  controllers: [LiveController]
})
export class LiveModule {}
