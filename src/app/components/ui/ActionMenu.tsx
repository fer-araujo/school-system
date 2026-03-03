import { useState, useRef, useEffect, type ReactNode } from "react";
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
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar el menú al hacer clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 text-slate-400 cursor-pointer hover:text-slate-700 bg-transparent hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
        title="Opciones"
      >
        <MoreHorizontal size={18} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="py-1.5 p-1">
            {items.map((item, index) => {
              const baseClasses = "w-full text-left flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer";
              const variantClasses = 
                item.variant === "danger" ? "text-rose-600 hover:bg-rose-50" :
                item.variant === "success" ? "text-emerald-600 hover:bg-emerald-50" :
                "text-slate-700 hover:bg-slate-100 hover:text-slate-900";

              return (
                <button
                  key={index}
                  onClick={() => {
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
        </div>
      )}
    </div>
  );
}