import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({
        description: 'Email del usuario registrado en el sistema',
        example: 'admin@universitas.gob.ve'
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        description: 'Contraseña del usuario (mínimo 6 caracteres)',
        example: 'universitas123',
        minLength: 6
    })
    @IsNotEmpty()
    @MinLength(6)
    password: string;
}
