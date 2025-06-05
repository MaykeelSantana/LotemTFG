import React, { useEffect, useState, useCallback } from 'react';
import { socketService } from '../../services/socket.service';
import { useAuthStore } from '../../store/auth.store';

export interface CatalogItemClient {
    id: string;
    name: string;
    description?: string;
    assetKey: string;
    price: number;
    category: string; 
    dimensionsGrid?: { width: number; height: number };
    isPlaceableInRoom: boolean;
    tags?: string[];
    isStackableInInventory?: boolean;
}

interface PurchaseResponseData {
    success: boolean;
    message?: string;
    inventoryItem?: any; 
    newBalance?: number;
}

/**
 * El componente CatalogPanel muestra un panel modal de catálogo/tienda para que los usuarios puedan explorar y comprar objetos.
 *
 * @component
 * @param {Object} props - Propiedades del componente.
 * @param {boolean} props.isOpen - Controla si el panel del catálogo es visible.
 * @param {() => void} props.onClose - Función de devolución de llamada para cerrar el panel del catálogo.
 *
 * @description
 * - Obtiene los objetos del catálogo desde el servidor al abrirse.
 * - Permite filtrar objetos por categoría.
 * - Muestra el saldo de monedas del usuario.
 * - Maneja la lógica de compra de objetos, incluyendo retroalimentación para éxito, errores y saldo insuficiente.
 * - Escucha eventos de resultado de compra en tiempo real a través de socket.
 * - Limpia el estado al cerrarse.
 *
 * @example
 * <CatalogPanel isOpen={isCatalogOpen} onClose={() => setCatalogOpen(false)} />
 */

const CatalogPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
        const [allCatalogItems, setAllCatalogItems] = useState<CatalogItemClient[]>([]);

    const [filteredCatalogItems, setFilteredCatalogItems] = useState<CatalogItemClient[]>([]);
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [purchaseStatus, setPurchaseStatus] = useState<string | null>(null);

    const currencyBalance = useAuthStore(state => state.user?.currencyBalance);
    const updateUserCredits = useAuthStore(state => state.updateCurrencyBalance);

    useEffect(() => {
        if (isOpen && allCatalogItems.length === 0 && !isLoading && !error) {
            setIsLoading(true);
            setError(null);
            socketService.emitGetCatalogItems({}, (response) => {
                setIsLoading(false);
                if (response.success && response.items) {
                    setAllCatalogItems(response.items);
                    const categories = Array.from(new Set(response.items.map(item => item.category)))
                                          .filter(cat => cat)
                                          .sort();
                    setAvailableCategories(['Todas', ...categories]);
                    if (selectedCategory !== 'Todas' && !categories.includes(selectedCategory)) {
                        setSelectedCategory('Todas'); 
                    } else {
                         
                         if(selectedCategory === 'Todas') setFilteredCatalogItems(response.items);
                    }
                } else {
                    setError(response.error || "Error cargando catálogo.");
                    setAvailableCategories(['Todas']); 
                }
            });
        }
    }, [isOpen, allCatalogItems.length, isLoading, error]); 


    useEffect(() => {
        if (!isOpen) {
            console.log("CatalogPanel: Cerrado. Limpiando estados.");
            setAllCatalogItems([]);
            setFilteredCatalogItems([]);
            setAvailableCategories([]);
            setSelectedCategory('Todas'); 
            setIsLoading(false);
            setError(null);
            setPurchaseStatus(null);
        } else {
           
            setPurchaseStatus(null);
        }
    }, [isOpen]);


    useEffect(() => {
        if (!isOpen || isLoading) return; 

        if (selectedCategory === 'Todas' || !selectedCategory) {
            setFilteredCatalogItems(allCatalogItems);
        } else {
            setFilteredCatalogItems(allCatalogItems.filter(item => item.category === selectedCategory));
        }
    }, [selectedCategory, allCatalogItems, isOpen, isLoading]); 

    useEffect(() => {
        if (!isOpen || !socketService.socket) return;

        const handleShopPurchaseResult = (data: PurchaseResponseData) => {
            console.log("CatalogPanel: Evento 'shop:purchase_result' recibido:", data);
            setPurchaseStatus(data.message || (data.success ? "¡Compra exitosa!" : "Falló la compra."));
            
            if (data.success && data.newBalance !== undefined) {
                updateUserCredits(data.newBalance);
            }
            const timerId = setTimeout(() => setPurchaseStatus(null), 4000);
            return () => clearTimeout(timerId); 
        };

        socketService.socket.on('shop:purchase_result', handleShopPurchaseResult);

        return () => {
            socketService.socket?.off('shop:purchase_result', handleShopPurchaseResult);
        };
    }, [isOpen, updateUserCredits]); 

    const handleCategorySelect = (category: string) => {
        setSelectedCategory(category);
    };

      const handleBuyItem = (itemId: string, price: number) => {
        if (currencyBalance === undefined || currencyBalance === null || currencyBalance < price) {
            setPurchaseStatus("Saldo insuficiente.");
            setTimeout(() => setPurchaseStatus(null), 3000);
            return;
        }
        setPurchaseStatus("Procesando compra...");
        socketService.emitBuyItem(itemId, (response: PurchaseResponseData) => {
            console.log("CatalogPanel: Callback de emitBuyItem (confirmación de emisión):", response);
            
            if (response.newBalance !== undefined) {
                useAuthStore.getState().updateCurrencyBalance(response.newBalance);
            }
            if (!response.success) {
                setPurchaseStatus(response.message || "Error en la solicitud de compra.");
                 setTimeout(() => setPurchaseStatus(null), 4000);
            }
            
        });
    };

    if (!isOpen) return null;
   return (
  <div
    className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[60] p-2 sm:p-4
               animate-fadeIn"
    role="dialog"
    aria-modal="true"
    aria-labelledby="catalog-title"
  >
    <div className="bg-slate-800 text-white p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col
                    transform transition-transform duration-300 ease-out scale-100"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 id="catalog-title" className="text-2xl sm:text-3xl font-bold text-teal-400">
          Catálogo de la Tienda
        </h2>
        <button
          onClick={onClose}
          className="text-red-500 hover:text-red-400 text-3xl sm:text-4xl font-bold"
          aria-label="Cerrar catálogo"
        >
          &times;
        </button>
      </div>
      <div className="flex justify-end items-center mb-3">
        <p className="text-md sm:text-lg text-amber-300">
          Tu Saldo: <span className="font-semibold">{currencyBalance ?? '---'}</span> créditos
        </p>
      </div>
      {purchaseStatus && (
        <p
          className={`text-center p-3 rounded-md my-2 text-sm sm:text-base ${
            purchaseStatus.includes('exitosa') || purchaseStatus.includes('éxito')
              ? 'bg-green-800 text-green-200'
              : purchaseStatus.includes('Procesando')
              ? 'bg-blue-800 text-blue-200'
              : 'bg-red-800 text-red-200'
          }`}
        >
          {purchaseStatus}
        </p>
      )}
      {error && !isLoading && (
        <p className="text-center text-red-300 bg-red-700/50 p-3 rounded-md mb-3">Error: {error}</p>
      )}
      <div className="flex flex-col md:flex-row gap-4 flex-grow min-h-0">
        <nav
          aria-label="Categorías del catálogo"
          className="w-full md:w-1/4 lg:w-1/5 md:pr-2 md:border-r md:border-slate-700 flex-shrink-0"
        >
          <h3 className="text-lg sm:text-xl font-semibold text-sky-400 mb-2 sm:mb-3">Categorías</h3>
          <div className="overflow-y-auto max-h-32 md:max-h-full md:h-auto pr-1 md:pr-0 custom-scrollbar">
            {(isLoading && availableCategories.length === 0) || (isLoading && allCatalogItems.length === 0) ? (
              <p className="text-slate-400">Cargando...</p>
            ) : availableCategories.length > 0 ? (
              <ul className="space-y-1">
                {availableCategories.map(category => (
                  <li key={category}>
                    <button
                      onClick={() => handleCategorySelect(category)}
                      className={`w-full text-left px-2 py-1.5 sm:px-3 sm:py-2 rounded-md transition-colors text-sm sm:text-base truncate
                                  ${
                                    selectedCategory === category
                                      ? 'bg-teal-500 text-white font-bold shadow-md'
                                      : 'bg-slate-600/50 hover:bg-slate-500/80 text-slate-200 hover:text-white'
                                  }`}
                    >
                      {category}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              !isLoading &&
              !error && <p className="text-slate-400">No hay categorías.</p>
            )}
          </div>
        </nav>

        {/* Columna de Ítems */}
        <section className="w-full md:w-3/4 lg:w-4/5 overflow-y-auto md:pl-2 flex-grow custom-scrollbar">
          {isLoading && filteredCatalogItems.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <svg
                className="animate-spin h-8 w-8 text-yellow-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                ></path>
              </svg>
              <p className="ml-3 text-yellow-400 text-lg">Cargando objetos...</p>
            </div>
          ) : !isLoading && error && filteredCatalogItems.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <p className="text-red-400 text-lg">No se pudieron cargar los ítems.</p>
            </div>
          ) : filteredCatalogItems.length > 0 ? (
            <div
              className="grid gap-3 sm:gap-4"
              style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              }}
            >
              {filteredCatalogItems.map(item => (
                <article
                  key={item.id}
                  className="bg-slate-700/70 p-3 sm:p-4 rounded-lg shadow-lg flex flex-col justify-between
                            hover:ring-2 hover:ring-teal-500 focus-within:ring-2 focus-within:ring-teal-400
                            transition-all duration-150 ease-in-out"
                  tabIndex={0}
                  aria-label={`${item.name}, precio ${item.price} créditos`}
                >
                  <div>
                    <div className="w-full h-32 sm:h-36 bg-slate-600/40 rounded-md border border-slate-500/50 flex items-center justify-center mb-2 sm:mb-3 p-1">
                      <img
                        src={`/assets/items_catalog/${item.assetKey}.png`}
                        alt={item.name}
                        className="max-w-full max-h-full object-contain"
                        loading="lazy"
                        onError={e => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/assets/items_catalog/placeholder.png';
                        }}
                      />
                    </div>
                    <h3
                      className="text-md sm:text-lg font-semibold text-teal-300 mb-1 truncate"
                      title={item.name}
                    >
                      {item.name}
                    </h3>
                    <p
                      className="text-xs sm:text-sm text-slate-300 mb-2 h-10 sm:h-12 overflow-hidden text-ellipsis line-clamp-2 sm:line-clamp-3"
                      title={item.description || 'Sin descripción.'}
                    >
                      {item.description || 'Sin descripción.'}
                    </p>
                    <p className="text-sm sm:text-base font-bold text-amber-400 mb-2 sm:mb-3">
                      Precio: {item.price} créditos
                    </p>
                  </div>
                  <button
                    onClick={() => handleBuyItem(item.id, item.price)}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-1.5 px-3 sm:py-2 sm:px-4 rounded-md text-xs sm:text-sm transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                    disabled={
                      isLoading ||
                      !!purchaseStatus ||
                      (currencyBalance !== undefined &&
                        currencyBalance !== null &&
                        currencyBalance < item.price)
                    }
                    aria-disabled={
                      isLoading ||
                      !!purchaseStatus ||
                      (currencyBalance !== undefined &&
                        currencyBalance !== null &&
                        currencyBalance < item.price)
                    }
                    title={
                      currencyBalance !== undefined && currencyBalance < item.price
                        ? 'Saldo insuficiente'
                        : undefined
                    }
                  >
                    Comprar
                  </button>
                </article>
              ))}
            </div>
          ) : (
            !isLoading && (
              <p className="text-center text-slate-400 text-lg mt-10">
                {selectedCategory && selectedCategory !== 'Todas'
                  ? `No hay objetos en la categoría "${selectedCategory}".`
                  : 'No hay objetos en el catálogo.'}
              </p>
            )
          )}
        </section>
      </div>
    </div>
  </div>
);
};

export default CatalogPanel;
