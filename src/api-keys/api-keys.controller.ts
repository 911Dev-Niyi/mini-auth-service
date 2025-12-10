import {
  Controller,
  Post,
  Body,
  Req,
  Delete,
  Param,
  Get,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RolloverApiKeyDto } from './dto/rollover-api-key.dto';
import type { RequestWithAuthenticatedUser } from '../auth/interfaces/request-with-user.interface';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';

@UseGuards(CombinedAuthGuard)
@Controller('keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  // POST /keys/create
  @Post('create')
  create(
    @Body() createApiKeyDto: CreateApiKeyDto,
    @Req() req: RequestWithAuthenticatedUser,
  ) {
    return this.apiKeysService.create(createApiKeyDto, req.user);
  }

  // POST /keys/rollover
  @Post('rollover')
  async rollover(
    @Body() rolloverApiKeyDto: RolloverApiKeyDto,
    @Req() req: RequestWithAuthenticatedUser,
  ) {
    return this.apiKeysService.rollover(rolloverApiKeyDto, req.user);
  }

  // GET /keys
  @Get()
  findAll(@Req() req: RequestWithAuthenticatedUser) {
    return this.apiKeysService.findAll(req.user);
  }

  // DELETE /keys/:id
  @Delete(':id')
  @HttpCode(200)
  remove(@Param('id') id: string, @Req() req: RequestWithAuthenticatedUser) {
    // Note: The service uses 'remove' to set is_active=false, which is better than hard delete.
    return this.apiKeysService.remove(id, req.user);
  }
}
