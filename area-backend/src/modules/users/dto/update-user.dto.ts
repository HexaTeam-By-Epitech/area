import { IsOptional, IsString, MinLength, IsBoolean } from 'class-validator';

export class UpdateUserDto {
    @IsOptional() @IsString() @MinLength(8) password?: string;
    @IsOptional() @IsBoolean() isVerified?: boolean;
    @IsOptional() @IsBoolean() isActive?: boolean;
}
