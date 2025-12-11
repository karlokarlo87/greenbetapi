import { Test, TestingModule } from '@nestjs/testing';
import { OddsService } from './odds.service';

describe('OddsService', () => {
  let service: OddsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OddsService],
    }).compile();

    service = module.get<OddsService>(OddsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
