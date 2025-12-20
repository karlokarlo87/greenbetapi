import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './user.entity';
import { Transaction, TransactionType, TransactionStatus } from './transaction.entity';
import { Ticket, TicketStatus, BetType } from './ticket.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { PlaceBetDto } from './dto/place-bet.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    private readonly dataSource: DataSource,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Return user without sensitive fields
    const { password, refreshToken, resetPasswordToken, resetPasswordExpires, ...userProfile } = user;
    return {
      user: userProfile,
    };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if email is being updated and if it's already taken
    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateProfileDto.email },
      });

      if (existingUser) {
        throw new BadRequestException('Email already exists');
      }
    }

    // Update fields
    if (updateProfileDto.name) user.name = updateProfileDto.name;
    if (updateProfileDto.lastname) user.lastname = updateProfileDto.lastname;
    if (updateProfileDto.birthDate) user.birthDate = new Date(updateProfileDto.birthDate);
    if (updateProfileDto.mobile) user.mobile = updateProfileDto.mobile;
    if (updateProfileDto.email) user.email = updateProfileDto.email;

    await this.userRepository.save(user);

    this.logger.log(`Profile updated for user: ${user.username}`);

    // Return user without sensitive fields
    const { password, refreshToken, resetPasswordToken, resetPasswordExpires, ...userProfile } = user;
    return {
      message: 'Profile updated successfully',
      user: userProfile,
    };
  }

  async deposit(userId: string, depositDto: DepositDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const balanceBefore = Number(user.balance);
      const amount = Number(depositDto.amount);
      const balanceAfter = balanceBefore + amount;

      // Update user balance
      user.balance = balanceAfter;
      await queryRunner.manager.save(user);

      // Create transaction record
      const transaction = queryRunner.manager.create(Transaction, {
        userId: user.id,
        type: TransactionType.DEPOSIT,
        amount: amount,
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
        status: TransactionStatus.COMPLETED,
        description: depositDto.description || 'Deposit to account',
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      this.logger.log(`Deposit successful for user ${user.username}: ${amount}`);

      return {
        message: 'Deposit successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          balance: balanceAfter,
        },
        transaction: {
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          balanceBefore: transaction.balanceBefore,
          balanceAfter: transaction.balanceAfter,
          createdAt: transaction.createdAt,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Deposit failed for user ${userId}:`, error);
      throw new BadRequestException('Deposit failed');
    } finally {
      await queryRunner.release();
    }
  }

  async withdraw(userId: string, withdrawDto: WithdrawDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const balanceBefore = Number(user.balance);
      const amount = Number(withdrawDto.amount);

      if (balanceBefore < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      const balanceAfter = balanceBefore - amount;

      // Update user balance
      user.balance = balanceAfter;
      await queryRunner.manager.save(user);

      // Create transaction record
      const transaction = queryRunner.manager.create(Transaction, {
        userId: user.id,
        type: TransactionType.WITHDRAW,
        amount: amount,
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
        status: TransactionStatus.COMPLETED,
        description: withdrawDto.description || 'Withdraw from account',
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      this.logger.log(`Withdraw successful for user ${user.username}: ${amount}`);

      return {
        message: 'Withdraw successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          balance: balanceAfter,
        },
        transaction: {
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          balanceBefore: transaction.balanceBefore,
          balanceAfter: transaction.balanceAfter,
          createdAt: transaction.createdAt,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Withdraw failed for user ${userId}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Withdraw failed');
    } finally {
      await queryRunner.release();
    }
  }

  async placeBet(userId: string, placeBetDto: PlaceBetDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const balanceBefore = Number(user.balance);
      const stake = Number(placeBetDto.stake);

      if (balanceBefore < stake) {
        throw new BadRequestException('Insufficient balance');
      }

      // Calculate total odds
      const totalOdds = placeBetDto.selections.reduce((acc, sel) => acc * Number(sel.odds), 1);
      const potentialWin = stake * totalOdds;

      // Update user balance
      const balanceAfter = balanceBefore - stake;
      user.balance = balanceAfter;
      await queryRunner.manager.save(user);

      // Create ticket
      const ticket = queryRunner.manager.create(Ticket, {
        userId: user.id,
        betType: placeBetDto.betType as BetType,
        stake: stake,
        totalOdds: totalOdds,
        potentialWin: potentialWin,
        actualWin: 0,
        status: TicketStatus.PENDING,
        selections: placeBetDto.selections,
      });
      await queryRunner.manager.save(ticket);

      // Create transaction record
      const transaction = queryRunner.manager.create(Transaction, {
        userId: user.id,
        type: TransactionType.BET_PLACED,
        amount: stake,
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
        status: TransactionStatus.COMPLETED,
        description: `Bet placed - ${placeBetDto.betType}`,
        referenceId: ticket.id,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      this.logger.log(`Bet placed successfully for user ${user.username}: ${stake}`);

      return {
        message: 'Bet placed successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          balance: balanceAfter,
        },
        ticket: {
          id: ticket.id,
          betType: ticket.betType,
          stake: ticket.stake,
          totalOdds: ticket.totalOdds,
          potentialWin: ticket.potentialWin,
          status: ticket.status,
          selections: ticket.selections,
          createdAt: ticket.createdAt,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Place bet failed for user ${userId}:`, error);
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Place bet failed');
    } finally {
      await queryRunner.release();
    }
  }

  async getTransactionHistory(userId: string, limit: number = 50, offset: number = 0) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      total,
      limit,
      offset,
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        balanceBefore: t.balanceBefore,
        balanceAfter: t.balanceAfter,
        status: t.status,
        description: t.description,
        createdAt: t.createdAt,
      })),
    };
  }

  async getBetHistory(userId: string, limit: number = 50, offset: number = 0) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const [tickets, total] = await this.ticketRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      total,
      limit,
      offset,
      tickets: tickets.map(t => ({
        id: t.id,
        betType: t.betType,
        stake: t.stake,
        totalOdds: t.totalOdds,
        potentialWin: t.potentialWin,
        actualWin: t.actualWin,
        status: t.status,
        selections: t.selections,
        createdAt: t.createdAt,
      })),
    };
  }

  async initializeBalances(initialBalance: number = 0) {
    try {
      // Get all users where balance is null or undefined
      const users = await this.userRepository.find();

      let updatedCount = 0;

      for (const user of users) {
        if (user.balance === null || user.balance === undefined) {
          user.balance = initialBalance;
          await this.userRepository.save(user);
          updatedCount++;
        }
      }

      this.logger.log(`Initialized balance for ${updatedCount} users with initial balance: ${initialBalance}`);

      return {
        message: 'Balance initialization completed',
        totalUsers: users.length,
        updatedUsers: updatedCount,
        initialBalance: initialBalance,
      };
    } catch (error) {
      this.logger.error('Failed to initialize balances:', error);
      throw new BadRequestException('Failed to initialize balances');
    }
  }

  async getAllUsersWithBalance() {
    try {
      const users = await this.userRepository.find({
        select: ['id', 'username', 'email', 'name', 'lastname', 'balance', 'createdAt'],
      });

      return {
        total: users.length,
        users: users.map(u => ({
          id: u.id,
          username: u.username,
          email: u.email,
          name: u.name,
          lastname: u.lastname,
          balance: u.balance,
          createdAt: u.createdAt,
        })),
      };
    } catch (error) {
      this.logger.error('Failed to get users with balance:', error);
      throw new BadRequestException('Failed to get users with balance');
    }
  }
}
