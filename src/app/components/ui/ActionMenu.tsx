import { useState, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

export interface ActionMenuItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  variant?: "default" | "danger" | "success";
}

interface ActionMenuProps {
  items: ActionMenuItem[];
}

export default function ActionMenu({ items }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  // Calculamos la posición exacta del botón en la pantalla para pegar ahí el menú
  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4, // 4px de separación hacia abajo
        left: rect.right + window.scrollX - 192, // 192px es el equivalente a w-48
      });
    }
  };

  // Escuchamos el scroll y resize para que el menú no se quede flotando si el usuario mueve la tabla
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      // El 'true' al final atrapa el scroll interno de la tabla
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
    }
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  // Cerrar el menú al hacer clic fuera de él (considerando tanto el botón como el menú flotante)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation(); // Evita clics fantasma en la fila de la tabla
          setIsOpen(!isOpen);
        }}
        className="p-1.5 text-slate-400 cursor-pointer hover:text-slate-700 bg-transparent hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
        title="Opciones"
      >
        <MoreHorizontal size={18} />
      </button>

      {/* LA MAGIA DEL PORTAL: Sacamos el menú del DOM local y lo pegamos en el body */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
            className="absolute w-48 bg-white rounded-xl shadow-lg border border-slate-200 ring-1 ring-black/5 z-20 animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="py-1.5 p-1">
              {items.map((item, index) => {
                const baseClasses =
                  "w-full text-left flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer";
                const variantClasses =
                  item.variant === "danger"
                    ? "text-rose-600 hover:bg-rose-50"
                    : item.variant === "success"
                      ? "text-emerald-600 hover:bg-emerald-50"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900";

                return (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      item.onClick();
                      setIsOpen(false);
                    }}
                    className={`${baseClasses} ${variantClasses}`}
                  >
                    <span className="opacity-80">{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
