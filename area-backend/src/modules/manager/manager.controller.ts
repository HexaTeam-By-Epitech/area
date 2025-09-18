import { Controller, Get } from '@nestjs/common';
import { ManagerService } from './manager.service';
import { HttpCode } from '@nestjs/common';

@Controller('manager')
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

    @Get()
    display(): string {
        return "Manager works!";
    }
}
