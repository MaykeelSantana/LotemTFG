import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';

export function Match(property: string, validationOptions?: ValidationOptions) {
    return (object: Record<string, any>, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            constraints: [property],
            validator: MatchConstraint,
        });
    };
}

/**
 * Validador personalizado para comprobar si el valor de una propiedad coincide con el valor de otra propiedad especificada.
 *
 * Esta clase implementa la interfaz `ValidatorConstraintInterface` de `class-validator` y se utiliza como restricción personalizada
 * para validar que dos propiedades de un objeto tengan el mismo valor, por ejemplo, para confirmar contraseñas.
 *
 * @example
 * ```typescript
 * @Match('password', { message: 'Las contraseñas no coinciden' })
 * confirmPassword: string;
 * ```
 *
 * @decorator
 * @ValidatorConstraint({ name: 'Match' })
 *
 * @method validate
 * Comprueba si el valor de la propiedad actual es igual al valor de la propiedad relacionada.
 * @param value - Valor de la propiedad actual.
 * @param args - Argumentos de validación que incluyen el nombre de la propiedad relacionada.
 * @returns `true` si ambos valores coinciden, `false` en caso contrario.
 *
 * @method defaultMessage
 * Devuelve el mensaje de error predeterminado cuando la validación falla.
 * @param args - Argumentos de validación que incluyen el nombre de la propiedad relacionada.
 * @returns Mensaje de error personalizado indicando que ambas propiedades deben coincidir.
 */
@ValidatorConstraint({ name: 'Match' })
export class MatchConstraint implements ValidatorConstraintInterface {
    validate(value: any, args: ValidationArguments) {
        const [relatedPropertyName] = args.constraints;
        const relatedValue = (args.object as any)[relatedPropertyName];
        return value === relatedValue;
    }

    defaultMessage(args: ValidationArguments) {
        const [relatedPropertyName] = args.constraints;
        return `${args.property} debe coincidir con ${relatedPropertyName}`;
    }
}
