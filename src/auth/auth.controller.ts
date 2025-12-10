import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';
import type {
  RequestWithAuthenticatedUser,
  JwtPayload,
} from '../auth/interfaces/request-with-user.interface';
import { User } from 'src/users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: AuthDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  login(@Body() dto: AuthDto) {
    return this.authService.login(dto);
  }
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleAuthRedirect(@Req() req: RequestWithAuthenticatedUser) {
    const user: User = req.user;

    const jwtPayload: JwtPayload = {
      id: user.id,
      email: user.email,
    };

    return this.authService.generateToken(jwtPayload);
  }
}
