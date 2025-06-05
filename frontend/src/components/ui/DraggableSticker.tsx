import React, { useState } from "react";
import { motion } from "framer-motion";
import useMediaQuery from "../../hooks/useMediaQuery";

type PositionValue = number | string;
interface Position {
  x: PositionValue;
  y: PositionValue;
}

interface DraggableStickerProps {
  /**
   * URL de la imagen del sticker.
   */
  imageUrl: string;
  /**
   * Tamaño del sticker en píxeles. Por defecto es 100.
   */
  size?: number;
  /**
   * Posición inicial del sticker. Por defecto { x: 100, y: 100 }.
   */
  initialPosition?: Position;
}

/**
 * Componente que muestra una imagen tipo sticker que puede ser arrastrada por el usuario.
 * No se muestra en pantallas pequeñas.
 *
 * @param {DraggableStickerProps} props - Propiedades del componente.
 * @returns {JSX.Element | null} El sticker draggable o null si la pantalla es pequeña.
 */
const DraggableSticker: React.FC<DraggableStickerProps> = ({
  imageUrl,
  size = 100,
  initialPosition = { x: 100, y: 100 }
}) => {
  const [pos, setPos] = useState<Position>({ x: 100, y: 100 });
  const [mark, setMark] = useState<Position | null>(null);
  const isSmall = useMediaQuery("(max-width: 768px)");
  if (isSmall) return null;

  return (
    <>
      {mark && (
        <div
          style={{
            position: "absolute",
            top: initialPosition.y,
            left: initialPosition.x,
            width: size,
            height: size,
            pointerEvents: "none",
            transform: `translate(-50%, -50%)`,
            maskImage: `url('${imageUrl}')`,
            WebkitMaskImage: `url('${imageUrl}')`,
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            backgroundColor: "rgb(255 255 255 / 0.7)",
            backgroundImage:
              "linear-gradient(rgb(238, 238, 243) 1.4px, transparent 1.4px), linear-gradient(to right, rgb(238, 238, 243) 1.4px, rgb(255, 255, 255) 1.4px)",
            backgroundSize: `${size}px ${size}px`,
            opacity: 0.7,
            zIndex: 5000,
          }}
        />
      )}

      <motion.img
        src={imageUrl}
        alt="Sticker"
        drag
        dragMomentum={false}
        dragElastic={0.2}
        style={{
          position: "absolute",
          top: initialPosition.y,
          left: initialPosition.x,
          width: size,
          height: size,
          cursor: "grab",
          zIndex: 9999,
          userSelect: "none",
          touchAction: "none",
          transform: "translate(-50%, -50%)",
        }}
        whileDrag={{ cursor: "grabbing" }}
        onDragStart={() => {
          setMark(pos);
        }}
      />
    </>
  );
};

export default DraggableSticker;
