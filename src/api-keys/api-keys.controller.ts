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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';

@UseGuards(CombinedAuthGuard)
@Controller('keys')
@ApiTags('API Key Management')
@ApiBearerAuth('JWT') // Primary security for management endpoints
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {} // POST /keys/create

  @Post('create')
  @ApiOperation({
    summary: 'Generate a new API key with specific permissions and expiry',
  })
  @ApiResponse({ status: 201, description: 'API Key created and returned.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid expiry format or max key limit reached (limit 5).',
  })
  create(
    @Body() createApiKeyDto: CreateApiKeyDto,
    @Req() req: RequestWithAuthenticatedUser,
  ) {
    return this.apiKeysService.create(createApiKeyDto, req.user);
  } // POST /keys/rollover

  @Post('rollover')
  @ApiOperation({
    summary:
      'Create a new key based on an expired key, reusing the same permissions',
  })
  @ApiResponse({
    status: 201,
    description: 'New API Key generated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Key is not yet expired or invalid ID.',
  })
  async rollover(
    @Body() rolloverApiKeyDto: RolloverApiKeyDto,
    @Req() req: RequestWithAuthenticatedUser,
  ) {
    return this.apiKeysService.rollover(rolloverApiKeyDto, req.user);
  } // GET /keys

  @Get()
  @ApiOperation({
    summary: 'Get a list of all active and inactive API keys for the user',
  })
  @ApiResponse({ status: 200, description: 'List of API keys retrieved.' })
  findAll(@Req() req: RequestWithAuthenticatedUser) {
    return this.apiKeysService.findAll(req.user);
  } // DELETE /keys/:id

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke (deactivate) an API key' })
  @ApiResponse({
    status: 200,
    description: 'API key successfully deactivated.',
  })
  @ApiResponse({ status: 404, description: 'API key not found.' })
  remove(@Param('id') id: string, @Req() req: RequestWithAuthenticatedUser) {
    return this.apiKeysService.remove(id, req.user);
  }
}
