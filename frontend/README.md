# Lotem - Juego MMO Multijugador 2D
![LOTEM](https://media.discordapp.net/attachments/725770481357291601/1380194782332321863/image.png?ex=6842fe0e&is=6841ac8e&hm=ff9ed1e765fc944c3353cfb27f0924d16780c0cdf0aee2413c1483eeb2c94342&=&format=webp&quality=lossless&width=1536&height=864)

## Tabla de Contenidos
1.  [Descripción del Proyecto](#descripción-del-proyecto)
2.  [Funcionalidades Implementadas](#funcionalidades-implementadas)
3.  [Tecnologías Utilizadas](#tecnologías-utilizadas)
4.  [Estructura del Proyecto](#estructura-del-proyecto)
5.  [Instalación y Puesta en Marcha](#instalación-y-puesta-en-marcha)
    * [Prerrequisitos](#prerrequisitos)
    * [Configuración del Backend](#configuración-del-backend)
    * [Configuración del Frontend](#configuración-del-frontend)
6.  [Uso](#uso)

## Descripción del Proyecto
Lotem es un prototipo de juego MMO  en 2D desarrollado como proyecto de tesis. El juego permite a los usuarios registrarse, personalizar la apariencia de sus personajes, explorar un mundo de juego, interactuar con otros jugadores en tiempo real a través de un sistema de chat, y moverse por el entorno. Incluye un sistema de salas (visualizado como un "HotelView" o lobby) para que los jugadores puedan crear o unirse a instancias de juego separadas, gestionar amistades, interactuar con contenido publicado y un panel CMS básico para la gestión de usuarios y contenido.

El objetivo principal del proyecto ha sido explorar y aplicar diversas tecnologías web modernas para la creación de una experiencia de juego multijugador rica y social en el navegador.

## Funcionalidades Implementadas

* **Autenticación de Usuarios:**
    * Registro de nuevas cuentas.
    * Inicio de sesión con credenciales.
    * Autenticación basada en Tokens JWT (JSON Web Tokens).
    * Verificación de email (estructura preparada, implementación completa puede variar).
* **Gestión de Perfil de Usuario (Frontend):**
    * Cambio de contraseña para el usuario autenticado.
    * Posibilidad de añadir/cambiar foto de perfil (backend preparado, frontend a implementar).
* **Creación y Personalización de Personajes:**
    * Creación automática de un personaje con estilos por defecto al entrar al juego/sala por primera vez si no existe.
    * Sistema de personalización de apariencia en capas:
        * Estilo de cuerpo (ej. base masculina/femenina, diferentes tonos).
        * Estilo de pelo 
        * Estilo de camisa 
        * Estilo de pantalones 
    * Panel de "Guardarropa" (`WardrobePanel`) para que el jugador modifique estos estilos.
    * Los cambios de apariencia se guardan en la base de datos y se notifican a otros jugadores en tiempo real.
* **Sistema de Salas (Lobby - `HotelView`):**
    * Los jugadores pueden ver una lista de salas disponibles (representadas como habitaciones de hotel o similar).
    * Crear nuevas salas de juego (con nombre, máximo de jugadores).
    * Unirse a salas existentes.
    * Salir de las salas.
    * La información de las salas (nombre, número de jugadores) se actualiza en tiempo real.
    * La instancia de juego en `GamePage` está vinculada a un `roomId` específico.
    * **Colocación de Objetos en Salas**: Solo el host (propietario) de la sala puede colocar objetos/muebles.
        * Sistema de previsualización del objeto antes de colocarlo.
        * Posibilidad de cancelar la colocación del objeto.
* **Mundo del Juego y Movimiento (Dentro de una Sala):**
    * Renderizado de un mapa 2D con obstáculos utilizando PixiJS.
    * Movimiento del jugador mediante "click-to-move".
    * Pathfinding del lado del servidor (A*) para calcular rutas evitando obstáculos.
    * Sincronización de la posición y movimiento de todos los jugadores en la misma sala en tiempo real.
* **Animación de Personajes:**
    * Uso de hojas de sprites (atlas JSON generados con TexturePacker) para las animaciones.
    * Animaciones de caminar en 4 direcciones (arriba, abajo, izquierda, derecha).
    * Pose "idle" (usando el primer frame de la animación de caminar correspondiente).
    * Animación de las diferentes capas de personalización (cuerpo, pelo, camisa, pantalones) sincronizadas.
* **Interacción Multijugador y Social:**
    * Visualización de otros jugadores en la misma sala.
    * Actualización en tiempo real de la apariencia de otros jugadores.
    * **Sistema de Amistad**:
        * Enviar, aceptar/rechazar solicitudes de amistad.
        * Lista de amigos.
        * Eliminar amigos.
    * **Chat en Tiempo Real**:
        * Chat global dentro de cada sala de juego.
        * Chat privado uno a uno entre amigos.
        * Capacidad de compartir imágenes y texto en chats privados.
    * **Llamadas WebRTC**:
        * Funcionalidad de llamadas de voz entre amigos utilizando WebRTC.
* **Sistema de Contenido e Inventario:**
    * **Catálogo de Objetos/Ítems**:
        * Visualización de un catálogo de objetos (ej. muebles para salas, ropa para personajes).
        * Sistema de filtrado por categorías dentro del catálogo.
    * **Sistema de Inventario**:
        * Cada jugador posee un inventario donde se almacenan los objetos que ha adquirido.
* **Sistema de Publicaciones (CMS y Frontend):**
    * **Noticias del Juego**: Sección para publicar noticias y actualizaciones oficiales del juego.
    * **Estados de Usuario (Tipo Tweets)**: Los usuarios pueden publicar mensajes cortos o "estados".
    * **Interacción con Posts**:
        * Sistema de "Me Gusta" (likes) para todos los tipos de posts.
        * Sistema de comentarios para los posts.
* **Panel CMS (Administración):**
    * **Gestión de Contenido**: Administración completa (crear, editar, eliminar) de todos los tipos de posts:
        * Noticias.
        * Estados/Tweets de usuarios.
        * Eventos (si se implementan).
        * Actualizaciones del juego (posts de tipo "update").

## Tecnologías Utilizadas

**Frontend:**
* **Lenguaje:** TypeScript
* **Librería Principal:** React (v18+)
* **Herramienta de Construcción/Entorno de Desarrollo:** Vite
* **Enrutamiento:** React Router DOM
* **Gestión de Estado Global:** Zustand
* **Estilos:** Tailwind CSS
* **Motor de Renderizado 2D (Juego):** PixiJS (v7.x)
* **Comunicación en Tiempo Real:** Socket.IO-client, WebRTC

**Backend:**
* **Lenguaje:** TypeScript
* **Entorno de Ejecución:** Node.js
* **Framework:** Express.js
* **ORM:** TypeORM
* **Autenticación:** Passport.js (con estrategias JWT - `passport-jwt`)
* **Hashing de Contraseñas:** bcrypt
* **Validación de Datos (DTOs):** `class-validator`, `class-transformer`
* **Comunicación en Tiempo Real:** Socket.IO, WebRTC 
* **Pathfinding:** `pathfinding` (librería de npm para A*)
* **Manejo de Subida de Archivos (para fotos de perfil/imágenes en chat):** `multer` 

**Base de Datos:**
* PostgreSQL (o la base de datos compatible con TypeORM que se haya configurado)

**Herramientas Adicionales:**
* **Control de Versiones:** Git, GitHub
* **Editor de Código:** Visual Studio Code
* **Creación de Atlas de Sprites:** TexturePacker (o similar)
* **Gestión de Paquetes:** npm o yarn

## Estructura del Proyecto

El proyecto está dividido en dos carpetas principales: `frontend` y `backend`.

* **`frontend/`**: Contiene la aplicación React construida con Vite.
    * `public/assets/`: Almacena los assets gráficos estáticos (imágenes, JSON de atlas de sprites).
    * `src/components/`: Componentes reutilizables de la interfaz (incluyendo `WardrobePanel`, componentes del CMS, etc.).
    * `src/pages/`: Componentes que representan las vistas principales (Auth, Game, Lobby/`HotelView`, Profile, Admin).
    * `src/services/`: Módulos para la comunicación con el backend (auth, socket, admin, room, etc..).
    * `src/store/`: Gestores de estado global (Zustand).
    * `src/types/`: Definiciones de tipos e interfaces de TypeScript.
* **`backend/`**: Contiene la aplicación Node.js/Express.
    * `src/config/`: Configuración de la base de datos (`data-source.ts`), Passport, etc.
    * `src/core/`: Lógica central compartida (ej. `grid.service.ts` para pathfinding, decoradores).
    * `src/modules/`: Módulos de la aplicación (auth, character, room, admin, post, friendship, chat), cada uno con sus entidades, servicios, controladores y DTOs.
    * `src/migrations/`: Migraciones de TypeORM para la base de datos.

## Instalación y Puesta en Marcha

Sigue estos pasos para configurar y ejecutar el proyecto en un entorno de desarrollo local.

### Prerrequisitos
* Node.js (v18.x o superior recomendado)
* npm (v9.x o superior) o yarn
* PostgreSQL instalado y un servidor en ejecución.
* Git

### Configuración del Backend

1.  **Clonar el Repositorio (si aplica):**
    ```bash
    git clone https://github.com/MaykeelSantana/LotemTFG.git
    cd backend 
    ```

2.  **Instalar Dependencias:**
    ```bash
    npm install
    # o
    yarn install
    ```

3.  **Configurar Variables de Entorno:**
    * Crea un archivo `.env` en la raíz de la carpeta `backend/` copiando el archivo `.env.example` (si existe) o creándolo desde cero.
    * Configura las siguientes variables (ajusta los valores según tu entorno):
        ```env
        PORT=3001
        FRONTEND_URL=http://localhost:5173 # URL de tu frontend

        # Configuración de la Base de Datos (PostgreSQL)
        DB_TYPE=postgres
        DB_HOST=localhost
        DB_PORT=5432
        DB_USERNAME=tu_usuario_postgres
        DB_PASSWORD=tu_contraseña_postgres
        DB_DATABASE=lotem_db_dev # O el nombre de tu base de datos

        # Secretos para JWT
        JWT_SECRET=TU_SUPER_SECRETO_PARA_JWT # Cambia esto por una cadena larga y aleatoria
        JWT_EXPIRES_IN=1h # Ejemplo: 1 hora

        # (EN MI CASO USO NEON, ASI QUE ESTA CONFIGURADO PARA USAR ESTA PLATAFORMA PERO SE PUEDE CONFIGURAR MUY FACIL PARA USAR LAS VARIABLES ANTERIORES.)
        ```

4.  **Configurar la Base de Datos:**
    * Asegúrate de que el servidor PostgreSQL esté en ejecución.
    * Crea la base de datos especificada en `DB_DATABASE` (ej. `lotem_db_dev`) si no existe.
    * Ejecuta las migraciones de TypeORM para crear las tablas y aplicar el esquema:
        ```bash
        npm run typeorm migration:run
        # o (dependiendo de tus scripts en package.json)
        # npx typeorm-ts-node-commonjs migration:run -d src/config/data-source.ts 
        ```

5.  **Ejecutar el Servidor Backend:**
    ```bash
    npm run devev
    ```
    El backend debería estar ahora ejecutándose en `http://localhost:3001` (o el puerto que hayas configurado).

### Configuración del Frontend

1.  **Navegar a la Carpeta del Frontend:**
    ```bash
    cd ../frontend 
    ```

2.  **Instalar Dependencias:**
    ```bash
    npm install
    # o
    yarn install
    ```

3.  **Configurar Variables de Entorno (si es necesario):**
    * Crea un archivo `.env.local` (o `.env`) en la raíz de la carpeta `frontend/` si necesitas configurar variables específicas para el frontend, por ejemplo, la URL de la API del backend si no es la de por defecto.
        ```env
        VITE_API_URL=http://localhost:3001/api
        VITE_SOCKET_URL=http://localhost:3001 
        ```
    * El código actual ya usa `import.meta.env.VITE_API_URL` y `import.meta.env.VITE_SOCKET_URL`, así que estas variables se tomarán del entorno o de los valores por defecto en el código.

4.  **Ejecutar el Servidor de Desarrollo del Frontend:**
    ```bash
    npm run dev
    # o
    yarn dev
    ```
    El frontend debería estar ahora accesible en `http://localhost:5173` (o el puerto que Vite asigne).

## Uso

1.  Abre tu navegador y ve a la URL del frontend (normalmente `http://localhost:5173`).
2.  Regístrate para crear una nueva cuenta o inicia sesión si ya tienes una.
3.  Click en Jugar y luego en Mis salas para ver la lista de salas, crear una nueva o unirte a una existente.
4.  Una vez en una sala (dentro de `GamePage`), podrás mover tu personaje, interactuar con el chat de la sala, y ver a otros jugadores.
5.  Si eres el host de la sala, podrás colocar objetos del catálogo en ella.
6.  Accede a tu perfil para cambiar tu contraseña.
7.  Explora el sistema de amistad para agregar amigos, chatear en privado e iniciar llamadas.
8.  Consulta las noticias del juego y publica tus propios estados.
9.  Si tienes rol de administrador, podrás acceder al panel CMS para gestionar todo el contenido publicado.

