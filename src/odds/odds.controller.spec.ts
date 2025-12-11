import { Test, TestingModule } from '@nestjs/testing';
import { OddsController } from './odds.controller';

describe('OddsController', () => {
  let controller: OddsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OddsController],
    }).compile();

    controller = module.get<OddsController>(OddsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
