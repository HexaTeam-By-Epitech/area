import { Injectable } from '@nestjs/common';

@Injectable()
export class ReactionService {
  findAll(): string[] {
    return ['reaction1', 'reaction2', 'reaction3'];
  }

  findOne(id: number): string {
    return `Reaction #${id}`;
  }

  create(reactionData: any): string {
    return 'Reaction created successfully';
  }

  update(id: number, updateData: any): string {
    return `Reaction #${id} updated successfully`;
  }

  remove(id: number): string {
    return `Reaction #${id} removed successfully`;
  }
}
