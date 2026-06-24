import { Controller, Post, Get } from '@nestjs/common';
import { SyncService } from './sync.service';

@Controller()
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('/sync')
  async syncAll() {
    return this.syncService.syncAll();
  }

  @Post('/sync/agencies')
  async syncAgenciesAndSpending() {
    return this.syncService.syncAgenciesAndSpending();
  }

  @Post('/sync/geography')
  async syncGeography() {
    return this.syncService.syncGeography();
  }

  @Post('/sync/disaster')
  async syncDisaster() {
    return this.syncService.syncDisaster();
  }

  @Get('/sync/status')
  getStatus() {
    return this.syncService.getStatus();
  }
}
