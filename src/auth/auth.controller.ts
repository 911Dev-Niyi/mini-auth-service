import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';
import type {
  RequestWithAuthenticatedUser,
  JwtPayload,
} from '../auth/interfaces/request-with-user.interface';
import { User } from 'src/users/entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({
    summary: 'Register a new user, create an associated wallet, and return JWT',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully, returns JWT token.',
  })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  signup(@Body() dto: AuthDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Logs in a user with email/password and returns a JWT token',
  })
  @ApiResponse({
    status: 201,
    description: 'Login successful, returns JWT token.',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  login(@Body() dto: AuthDto) {
    return this.authService.login(dto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google SSO sign-in (Browser Redirect)' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google for authentication.',
  })
  googleAuth() {
    // Handled by AuthGuard redirect
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Google SSO callback handler (Finalizes login and returns JWT)',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT token.',
  })
  googleAuthRedirect(@Req() req: RequestWithAuthenticatedUser) {
    const user: User = req.user;

    const jwtPayload: JwtPayload = {
      id: user.id,
      email: user.email,
    };

    return this.authService.generateToken(jwtPayload);
  }
}
