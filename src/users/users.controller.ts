import { Controller, Get, Patch, Post, UseGuards, Request, Body, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { PlaceBetDto } from './dto/place-bet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return await this.usersService.getProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return await this.usersService.updateProfile(req.user.userId, updateProfileDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('deposit')
  async deposit(@Request() req, @Body() depositDto: DepositDto) {
    return await this.usersService.deposit(req.user.userId, depositDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('withdraw')
  async withdraw(@Request() req, @Body() withdrawDto: WithdrawDto) {
    return await this.usersService.withdraw(req.user.userId, withdrawDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('place-bet')
  async placeBet(@Request() req, @Body() placeBetDto: PlaceBetDto) {
    return await this.usersService.placeBet(req.user.userId, placeBetDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  async getTransactionHistory(
    @Request() req,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.usersService.getTransactionHistory(
      req.user.userId,
      limit ? Number(limit) : 50,
      offset ? Number(offset) : 0,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('bets')
  async getBetHistory(
    @Request() req,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.usersService.getBetHistory(
      req.user.userId,
      limit ? Number(limit) : 50,
      offset ? Number(offset) : 0,
    );
  }
}
