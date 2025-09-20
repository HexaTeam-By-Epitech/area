import { IsEmail, IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
    @ApiProperty({ description: 'Email of the user' })
    @IsEmail()
    email: string;

    @ApiProperty({ description: 'Password of the user', minLength: 8 })
    @IsString()
    @MinLength(8)
    password_hash: string;

    @ApiPropertyOptional({ description: 'Whether the user is verified', default: false })
    @IsOptional()
    @IsBoolean()
    is_verified?: boolean;
}
