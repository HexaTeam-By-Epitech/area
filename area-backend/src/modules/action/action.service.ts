import { Injectable } from '@nestjs/common';

@Injectable()
export class ActionService {
  findAll(): string[] {
    return ['action1', 'action2', 'action3'];
  }

  findOne(id: number): string {
    return `Action #${id}`;
  }

  create(actionData: any): string {
    return 'Action created successfully';
  }

  update(id: number, updateData: any): string {
    return `Action #${id} updated successfully`;
  }

  remove(id: number): string {
    return `Action #${id} removed successfully`;
  }
}
