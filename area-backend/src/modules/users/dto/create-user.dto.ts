import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
    @ApiProperty({ description: 'Email of the user' })
    @IsEmail()
    email: string;

    @ApiProperty({ description: 'Password of the user', minLength: 8 })
    @IsString()
    @MinLength(8)
    password_hash: string;
}
