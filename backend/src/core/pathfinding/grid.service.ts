import { Grid, AStarFinder, Util as PathfindingUtil, DiagonalMovement } from 'pathfinding';

export const WORLD_WIDTH = 2000; 
export const WORLD_HEIGHT = 1200; 
export const CELL_SIZE = 20; 
export const GRID_COLS = Math.floor(WORLD_WIDTH / CELL_SIZE);
export const GRID_ROWS = Math.floor(WORLD_HEIGHT / CELL_SIZE);

const matrix: number[][] = [];
for (let y = 0; y < GRID_ROWS; y++) {
    matrix[y] = [];
    for (let x = 0; x < GRID_COLS; x++) {
        matrix[y][x] = 0; 
    }
}

export const gameGrid = new Grid(matrix);
export const getGameGridMatrix = (): Readonly<number[][]> => {
    return matrix; 
};

const aStarFinder = new AStarFinder({
    diagonalMovement: DiagonalMovement.Always,
   
});

export function worldToGridCoords(worldX: number, worldY: number): { x: number; y: number } {
    const gridX = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(worldX / CELL_SIZE)));
    const gridY = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(worldY / CELL_SIZE)));
    return { x: gridX, y: gridY };
}

export function gridToWorldCoords(gridX: number, gridY: number): { x: number; y: number } {
    const worldX = gridX * CELL_SIZE + CELL_SIZE / 2;
    const worldY = gridY * CELL_SIZE + CELL_SIZE / 2;
    return { x: worldX, y: worldY };
}

/**
 * Encuentra y devuelve el camino más corto entre dos puntos en una cuadrícula utilizando el algoritmo A*.
 *
 * Este método clona la cuadrícula de juego actual para evitar modificar el estado original durante la búsqueda.
 * Primero, verifica que tanto el punto de inicio como el de destino sean transitables. Si alguno de los dos no lo es,
 * retorna un arreglo vacío y emite una advertencia en la consola.
 *
 * Si ambos puntos son válidos, utiliza el algoritmo A* para calcular el camino más corto entre ellos. Si se encuentra
 * un camino, este se suaviza utilizando la utilidad `PathfindingUtil.smoothenPath` para eliminar movimientos innecesarios
 * y hacerlo más natural. Si no se encuentra un camino, retorna el resultado tal cual (posiblemente un arreglo vacío).
 *
 * En caso de cualquier error durante la ejecución del algoritmo de búsqueda o el suavizado del camino, se captura la
 * excepción, se registra el error en la consola y se retorna un arreglo vacío.
 *
 * @param startGridX - Coordenada X del punto de inicio en la cuadrícula.
 * @param startGridY - Coordenada Y del punto de inicio en la cuadrícula.
 * @param endGridX - Coordenada X del punto de destino en la cuadrícula.
 * @param endGridY - Coordenada Y del punto de destino en la cuadrícula.
 * @returns Un arreglo bidimensional de números representando el camino desde el punto de inicio al de destino.
 *          Cada elemento es una tupla [x, y] correspondiente a una celda de la cuadrícula. Si no hay camino posible,
 *          retorna un arreglo vacío.
 */
export function findPath(startGridX: number, startGridY: number, endGridX: number, endGridY: number): number[][] {
    const gridInstance = gameGrid.clone(); 
    try {
        
        if (!gridInstance.isWalkableAt(startGridX, startGridY)) {
            console.warn(`Pathfinding: El punto de inicio (${startGridX},${startGridY}) no es transitable.`);
            return [];
        }
        if (!gridInstance.isWalkableAt(endGridX, endGridY)) {
            console.warn(`Pathfinding: El punto de destino (${endGridX},${endGridY}) no es transitable.`);
            return [];
        }
        const path = aStarFinder.findPath(startGridX, startGridY, endGridX, endGridY, gridInstance);

        if (path && path.length > 0) {
            const smoothedPath = PathfindingUtil.smoothenPath(gridInstance, path);
            return smoothedPath;
        }
        return path; 
    } catch (e) {
        console.error("Error en A* findPath o smoothenPath:", e);
        return []; 
    }
}
