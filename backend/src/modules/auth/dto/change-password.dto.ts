import { IsNotEmpty, IsString, MinLength, Matches, MaxLength } from 'class-validator';
import { Match } from '../../../core/decorators/match.decorator'; 

export class ChangePasswordDto {
    @IsNotEmpty({ message: 'La contraseña actual no puede estar vacía.' })
    @IsString({ message: 'La contraseña actual debe ser un texto.' })
    currentPassword!: string;

    @IsNotEmpty({ message: 'La nueva contraseña no puede estar vacía.' })
    @IsString({ message: 'La nueva contraseña debe ser un texto.' })
    @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres.' })
    @MaxLength(50, { message: 'La nueva contraseña no puede tener más de 50 caracteres.' })
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'La nueva contraseña debe contener al menos una mayúscula, una minúscula y un número o carácter especial.'
    })
    newPassword!: string;

    @IsNotEmpty({ message: 'La confirmación de la nueva contraseña no puede estar vacía.' })
    @IsString({ message: 'La confirmación de la nueva contraseña debe ser un texto.' })
    @Match('newPassword', { message: 'La nueva contraseña y la confirmación no coinciden.' })
    newPasswordConfirm!: string;
}
