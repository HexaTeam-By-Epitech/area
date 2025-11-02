import { Injectable } from '@nestjs/common';
import { ManagerService } from './modules/manager/manager.service';

@Injectable()
export class AppService {
  constructor(private readonly managerService: ManagerService) {}

  getHello(): string {
    return 'Hello World!';
  }

  getAbout(clientIp: string) {
    // Get all services with their actions and reactions from ManagerService
    const services = this.managerService.getServicesForAbout();

    return {
      client: {
        host: clientIp
      },
      server: {
        current_time: Math.floor(Date.now() / 1000),
        services
      }
    };
  }
}
