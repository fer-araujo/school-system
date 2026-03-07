import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
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

  // 1. Envolvemos la función en useCallback para poder usarla de forma segura en useEffect y onClick
  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX - 192,
      });
    }
  }, []);

  // 2. Mantenemos el escuchador para que siga al botón si haces scroll, pero cerramos si scrollean mucho
  useEffect(() => {
    if (isOpen) {
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
    }
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  // Cerrar el menú al hacer clic fuera
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
          e.stopPropagation();
          // 🚨 LA CLAVE: Calculamos la posición ANTES de que nazca el menú
          if (!isOpen) {
            updatePosition();
          }
          setIsOpen(!isOpen);
        }}
        className="p-1.5 text-slate-400 cursor-pointer hover:text-slate-700 bg-transparent hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
        title="Opciones"
      >
        <MoreHorizontal size={18} />
      </button>

      {/* LA MAGIA DEL PORTAL */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
            className="absolute w-48 bg-white rounded-xl shadow-lg border border-slate-200 ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95 origin-top-right duration-100"
          >
            <div className="py-1.5 p-1">
              {items.map((item, index) => {
                const baseClasses =
                  "w-full text-left flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer focus:outline-none";
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
                      setIsOpen(false); // Cierra el menú al elegir una opción
                      item.onClick();
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
