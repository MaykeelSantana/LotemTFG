import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Opciones de configuración para la fuente de datos de TypeORM.
 *
 * @remarks
 * Este objeto define los parámetros necesarios para establecer la conexión con una base de datos PostgreSQL
 * utilizando TypeORM. Incluye la configuración de conexión, entidades, migraciones y suscriptores.
 *
 * @property {string} type - El tipo de base de datos a utilizar. En este caso, 'postgres'.
 * @property {string | undefined} url - La URL de conexión a la base de datos, obtenida de la variable de entorno `DATABASE_URL`.
 * @property {boolean} ssl - Indica si la conexión debe usar SSL. Es recomendable para entornos de producción.
 * @property {boolean} synchronize - Si es `true`, TypeORM sincronizará automáticamente el esquema de la base de datos con las entidades. No recomendado en producción.
 * @property {Array<'query' | 'error'>} logging - Define los tipos de logs que se generarán. En este caso, se registran consultas y errores.
 * @property {string[]} entities - Rutas a los archivos de entidades que TypeORM debe cargar. Utiliza un patrón glob para incluir todos los archivos `.entity.ts` o `.entity.js` en los módulos.
 * @property {string[]} migrations - Rutas a los archivos de migraciones que TypeORM debe cargar. Utiliza un patrón glob para incluir todos los archivos `.ts` o `.js` en la carpeta de migraciones.
 * @property {string[]} subscribers - Rutas a los archivos de suscriptores de eventos de TypeORM. Utiliza un patrón glob para incluir todos los archivos `.ts` o `.js` en la carpeta de suscriptores.
 *
 * @example
 * // Uso típico en la inicialización de TypeORM:
 * import { DataSource } from 'typeorm';
 * import { dataSourceOptions } from './config/data-source';
 * const dataSource = new DataSource(dataSourceOptions);
 */
export const dataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    url: process.env.DATABASE_URL, 
    ssl: true, 
    synchronize: true, 
    logging: ['query', 'error'],

    entities: [
        path.join(__dirname, '..', 'modules', '**', 'entities', '*.entity.{ts,js}')
    ],
    migrations: [
        path.join(__dirname, '..', 'migrations', '*.{ts,js}')
    ],
    subscribers: [
        path.join(__dirname, '..', 'subscribers', '*.{ts,js}')
    ],
};
const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;