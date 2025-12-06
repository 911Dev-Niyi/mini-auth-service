import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return 'Public Route';
  }

  @UseGuards(AuthGuard('api-key'))
  @Get('service/data')
  getServiceData() {
    return {
      message: 'You have accessed the protected service data!',
      timestamp: new Date(),
    };
  }
}
