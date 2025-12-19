import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto, ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Validate passwords match
    if (registerDto.password !== registerDto.repeatPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: [
        { email: registerDto.email },
        { username: registerDto.username },
        { personalnumber: registerDto.personalnumber },
      ],
    });

    if (existingUser) {
      if (existingUser.email === registerDto.email) {
        throw new BadRequestException('Email already exists');
      }
      if (existingUser.username === registerDto.username) {
        throw new BadRequestException('Username already exists');
      }
      if (existingUser.personalnumber === registerDto.personalnumber) {
        throw new BadRequestException('Personal number already exists');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = this.userRepository.create({
      name: registerDto.name,
      lastname: registerDto.lastname,
      personalnumber: registerDto.personalnumber,
      birthDate: new Date(registerDto.birthDate),
      mobile: registerDto.mobile,
      email: registerDto.email,
      username: registerDto.username,
      password: hashedPassword,
    });

    await this.userRepository.save(user);

    this.logger.log(`User registered successfully: ${user.username}`);

    // Return user without password
    const { password, refreshToken, resetPasswordToken, resetPasswordExpires, ...result } = user;
    return {
      message: 'User registered successfully',
      user: result,
    };
  }

  async login(loginDto: LoginDto) {
    // Find user by username
    const user = await this.userRepository.findOne({
      where: { username: loginDto.username },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Save refresh token
    user.refreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userRepository.save(user);

    this.logger.log(`User logged in successfully: ${user.username}`);

    // Return user without password and tokens
    const { password, refreshToken, resetPasswordToken, resetPasswordExpires, ...userResult } = user;
    return {
      message: 'Login successful',
      user: userResult,
      ...tokens,
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key-change-in-production',
      });

      // Find user
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify stored refresh token
      const isRefreshTokenValid = await bcrypt.compare(
        refreshTokenDto.refreshToken,
        user.refreshToken
      );

      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Update refresh token
      user.refreshToken = await bcrypt.hash(tokens.refreshToken, 10);
      await this.userRepository.save(user);

      this.logger.log(`Tokens refreshed for user: ${user.username}`);

      return {
        message: 'Tokens refreshed successfully',
        ...tokens,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async requestPasswordReset(requestPasswordResetDto: RequestPasswordResetDto) {
    const user = await this.userRepository.findOne({
      where: { email: requestPasswordResetDto.email },
    });

    if (!user) {
      // Don't reveal if email exists
      return {
        message: 'If the email exists, a password reset link has been sent',
      };
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = this.jwtService.sign(
      { sub: user.id, type: 'password-reset' },
      {
        secret: process.env.JWT_RESET_SECRET || 'reset-secret-key-change-in-production',
        expiresIn: '1h',
      }
    );

    // Save reset token and expiry
    user.resetPasswordToken = await bcrypt.hash(resetToken, 10);
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await this.userRepository.save(user);

    this.logger.log(`Password reset requested for user: ${user.username}`);

    // In production, send email with reset link
    // For now, return the token (remove this in production)
    return {
      message: 'If the email exists, a password reset link has been sent',
      resetToken: resetToken, // Remove in production, send via email instead
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    // Validate passwords match
    if (resetPasswordDto.newPassword !== resetPasswordDto.repeatPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    try {
      // Verify reset token
      const payload = this.jwtService.verify(resetPasswordDto.token, {
        secret: process.env.JWT_RESET_SECRET || 'reset-secret-key-change-in-production',
      });

      if (payload.type !== 'password-reset') {
        throw new UnauthorizedException('Invalid reset token');
      }

      // Find user
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.resetPasswordToken || !user.resetPasswordExpires) {
        throw new UnauthorizedException('Invalid or expired reset token');
      }

      // Check if token is expired
      if (new Date() > user.resetPasswordExpires) {
        throw new UnauthorizedException('Reset token has expired');
      }

      // Verify stored reset token
      const isResetTokenValid = await bcrypt.compare(
        resetPasswordDto.token,
        user.resetPasswordToken
      );

      if (!isResetTokenValid) {
        throw new UnauthorizedException('Invalid reset token');
      }

      // Hash new password
      user.password = await bcrypt.hash(resetPasswordDto.newPassword, 10);
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      user.refreshToken = null; // Invalidate all refresh tokens

      await this.userRepository.save(user);

      this.logger.log(`Password reset successfully for user: ${user.username}`);

      return {
        message: 'Password reset successfully',
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }

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

  async updateProfile(userId: string, updateProfileDto: any) {
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

  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'secret-key-change-in-production',
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key-change-in-production',
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
