import React, { useState, useEffect } from 'react';

interface StyleOption {
    key: string;
    name: string;
}

export interface SelectedStyles {
    hairStyle: string;
    shirtStyle: string;
    pantsStyle: string;
    bodyStyle?: string; 
}

interface WardrobePanelProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (styles: SelectedStyles) => void;
    currentStyles: SelectedStyles;
    availableStyles: {
        hair: StyleOption[];
        shirt: StyleOption[];
        pants: StyleOption[];
        body?: StyleOption[]; 
    };
}

/**
 * El componente WardrobePanel permite a los usuarios personalizar la apariencia de su personaje seleccionando estilos para diferentes categorías
 * como cuerpo, cabello, camisa y pantalones. Muestra un panel modal con opciones de estilo y proporciona las acciones "Aplicar" y "Cerrar".
 *
 * @component
 * @param {object} props - Las propiedades del componente.
 * @param {boolean} props.isOpen - Indica si el panel del guardarropa está abierto y visible.
 * @param {() => void} props.onClose - Función de devolución de llamada para cerrar el panel del guardarropa.
 * @param {(styles: SelectedStyles) => void} props.onApply - Función de devolución de llamada para aplicar los estilos seleccionados.
 * @param {SelectedStyles} props.currentStyles - Los estilos actualmente aplicados al personaje.
 * @param {AvailableStyles} props.availableStyles - Las opciones de estilo disponibles para cada categoría.
 *
 * @returns {JSX.Element | null} El panel del guardarropa renderizado, o null si no está abierto.
 */

const WardrobePanel: React.FC<WardrobePanelProps> = ({
    isOpen,
    onClose,
    onApply,
    currentStyles,
    availableStyles
}) => {
    const [tempStyles, setTempStyles] = useState<SelectedStyles>(currentStyles);

    useEffect(() => {
        if (isOpen) {
            setTempStyles(currentStyles);
        }
    }, [currentStyles, isOpen]);

    if (!isOpen) return null;

    const handleStyleChange = (category: keyof SelectedStyles, styleKey: string) => {
        setTempStyles(prev => ({ ...prev, [category]: styleKey }));

    };

    const handleApplyClick = () => {
          onApply(tempStyles);
    };

    const renderCategory = (categoryName: string, categoryKey: keyof SelectedStyles, options: StyleOption[]) => {
        if (!options || options.length === 0) return null;
        return (
            <div style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #444' }}>
                <h3 style={{ marginTop: 0, marginBottom: '8px', color: '#FFF' }}>{categoryName}</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {options.map(style => (
                        <button
                            key={style.key}
                            onClick={() => handleStyleChange(categoryKey, style.key)}
                            style={{
                                padding: '8px 12px',
                                border: tempStyles[categoryKey] === style.key ? '2px solid #00bcd4' : '2px solid #555',
                                backgroundColor: tempStyles[categoryKey] === style.key ? '#00798c' : '#333',
                                color: 'white',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            {style.name}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
     <div
  style={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(30, 30, 45, 0.95)', // más oscuro y azul grisáceo
    padding: '30px 35px',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8)',
    zIndex: 100,
    color: '#E0E0E0',
    width: '90%',
    maxWidth: '520px',
    maxHeight: '85vh',
    overflowY: 'auto',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    userSelect: 'none',
  }}
>
  <h2
    style={{
      textAlign: 'center',
      marginTop: 0,
      marginBottom: '24px',
      color: '#14B8A6', // teal vibrante
      fontWeight: '700',
      fontSize: '1.8rem',
      textShadow: '0 0 10px #14B8A6',
    }}
  >
    Personalizar Apariencia
  </h2>

  {renderCategory("Cuerpo", "bodyStyle" as any, availableStyles.body || [])}
  {renderCategory("Pelo", "hairStyle", availableStyles.hair)}
  {renderCategory("Camisa", "shirtStyle", availableStyles.shirt)}
  {renderCategory("Pantalones", "pantsStyle", availableStyles.pants)}

  <div
    style={{
      marginTop: '30px',
      display: 'flex',
      justifyContent: 'space-between',
      gap: '20px',
    }}
  >
    <button
      onClick={handleApplyClick}
      style={{
        flex: 1,
        padding: '12px 0',
        backgroundColor: '#14B8A6',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1.1rem',
        fontWeight: '600',
        boxShadow: '0 4px 10px rgba(20, 184, 166, 0.6)',
        transition: 'background-color 0.3s ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#0F766E')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#14B8A6')}
    >
      Aplicar Cambios
    </button>

    <button
      onClick={onClose}
      style={{
        flex: 1,
        padding: '12px 0',
        backgroundColor: '#EF4444',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1.1rem',
        fontWeight: '600',
        boxShadow: '0 4px 10px rgba(239, 68, 68, 0.6)',
        transition: 'background-color 0.3s ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#B91C1C')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#EF4444')}
    >
      Cerrar
    </button>
  </div>
</div>
    );
};

export default WardrobePanel;