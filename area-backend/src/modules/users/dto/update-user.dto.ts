import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
    @ApiPropertyOptional({ description: 'Whether the user is active' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
