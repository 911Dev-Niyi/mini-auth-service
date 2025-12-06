import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { AuthGuard } from '@nestjs/passport';
import { User } from '../users/entities/user.entity';

interface RequestWithUser {
  user: User;
}

@UseGuards(AuthGuard('jwt'))
@Controller('keys/create')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  create(@Request() req: RequestWithUser) {
    return this.apiKeysService.create(req.user);
  }

  @Get()
  findAll(@Request() req: RequestWithUser) {
    return this.apiKeysService.findAll(req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.apiKeysService.remove(id, req.user);
  }
}
