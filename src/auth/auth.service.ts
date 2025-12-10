import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { WalletService } from '../wallet/wallet.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuthDto } from './dto/auth.dto';
import { JwtPayload } from './interfaces/request-with-user.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private readonly walletService: WalletService,
  ) {}
  generateToken(payload: JwtPayload) {
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
  async signup(dto: AuthDto) {
    const { email, password } = dto; // Check if email exists

    const existing = await this.usersRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('User already exists');
    } // Hash password

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt); // Save User

    const user = this.usersRepository.create({
      email,
      password_hash: hashedPassword,
    });
    await this.usersRepository.save(user);

    await this.walletService.createWallet(user);

    return { message: 'User created successfully', id: user.id };
  }

  async login(dto: AuthDto) {
    const { email, password } = dto; // Find user

    const user = await this.usersRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password_hash'],
    });

    // Check if user exists OR if user exists but has no password hash (SSO user)
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
    };

    return this.generateToken(payload); // Pass the cleaned payload
  }
}
