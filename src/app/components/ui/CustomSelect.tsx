import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string | string[]; // String para normal, Array para multi
  onChange: (val: string | string[]) => void;
  placeholder?: string;
  isMulti?: boolean;
  isSearchable?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  name?: string;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  isMulti = false,
  isSearchable = false,
  disabled = false,
  required = false,
  error,
  name,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
    }
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option: SelectOption) => {
    if (isMulti) {
      const currentValues = Array.isArray(value) ? value : [];
      if (currentValues.includes(option.value)) {
        onChange(currentValues.filter((v) => v !== option.value));
      } else {
        onChange([...currentValues, option.value]);
      }
    } else {
      onChange(option.value);
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  const removeValue = (e: React.MouseEvent, valToRemove: string) => {
    e.stopPropagation();
    if (isMulti && Array.isArray(value)) {
      onChange(value.filter((v) => v !== valToRemove));
    }
  };

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const renderValue = () => {
    if (isMulti && Array.isArray(value)) {
      if (value.length === 0)
        return <span className="text-slate-400">{placeholder}</span>;
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => {
            const opt = options.find((o) => o.value === v);
            return (
              <span
                key={v}
                className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-xs font-semibold border border-blue-100"
              >
                {opt?.label || v}
                <X
                  size={12}
                  className="cursor-pointer hover:text-rose-500 transition-colors"
                  onClick={(e) => removeValue(e, v)}
                />
              </span>
            );
          })}
        </div>
      );
    }

    if (!value) return <span className="text-slate-400">{placeholder}</span>;
    const selectedOpt = options.find((o) => o.value === value);
    return (
      <span className="text-slate-700 font-medium">
        {selectedOpt?.label || value}
      </span>
    );
  };

  // Valor plano para el input nativo
  const getInputValue = () => {
    if (!value) return "";
    return Array.isArray(value) ? value.join(",") : value;
  };

  return (
    <div className="w-full relative">
      {/* 🌟 INPUT INVISIBLE PARA EL REQUIRED */}
      <input
        type="text"
        name={name}
        required={required}
        value={getInputValue()}
        onChange={() => {}}
        onFocus={() => {
          if (!disabled) {
            if (!isOpen) updatePosition();
            setIsOpen(true);
          }
        }}
        className="opacity-0 absolute inset-0 w-full h-full -z-10 pointer-events-none"
        tabIndex={-1}
      />

      <div
        ref={triggerRef}
        onClick={(e) => {
          if (disabled) return;
          e.stopPropagation();
          if (!isOpen) {
            updatePosition();
          }
          setIsOpen(!isOpen);
        }}
        className={`relative flex items-center justify-between w-full bg-white border rounded-lg px-3 py-1.5 transition-all select-none ${
          disabled
            ? "bg-slate-50 opacity-60 cursor-not-allowed border-slate-200"
            : "cursor-pointer"
        } ${
          error
            ? "border-rose-500 ring-1 ring-rose-500/50 bg-rose-50/10"
            : isOpen
              ? "border-blue-500 ring-2 ring-blue-500/20"
              : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <div className="flex-1 truncate pr-4">{renderValue()}</div>
        <ChevronDown
          size={16}
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {error && (
        <p className="text-[11px] text-rose-500 mt-1 font-medium pl-1">
          {error}
        </p>
      )}

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
            }}
            className="absolute z-100 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
          >
            {isSearchable && (
              <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-sm text-slate-400">
                  No hay resultados.
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = isMulti
                    ? (value as string[]).includes(opt.value)
                    : value === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => handleSelect(opt)}
                      className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-blue-50/80 text-blue-700 font-semibold"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {opt.label}
                      {isSelected && (
                        <Check size={14} className="text-blue-600" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
