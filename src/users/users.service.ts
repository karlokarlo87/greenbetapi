import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
}
