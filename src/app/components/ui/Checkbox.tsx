import { Check } from "lucide-react";
import type { InputHTMLAttributes } from "react";

interface CustomCheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function CustomCheckbox({
  label,
  checked,
  onChange,
  disabled,
  className = "",
  ...props
}: CustomCheckboxProps) {
  return (
    <label
      className={`flex items-center gap-3 cursor-pointer group w-max ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          className="peer sr-only" // Ocultamos el nativo, pero sigue siendo accesible por teclado
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          {...props}
        />
        {/* La caja visual */}
        <div
          className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center
          ${
            checked
              ? "bg-blue-600 border-blue-600 shadow-[0_2px_10px_rgba(37,99,235,0.2)]"
              : "bg-white border-slate-300 group-hover:border-blue-400"
          }
          peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500/30
        `}
        >
          {/* La palomita animada */}
          <Check
            size={14}
            strokeWidth={3}
            className={`text-white transition-transform duration-200 ${checked ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}
          />
        </div>
      </div>
      {label && (
        <span className="text-sm font-medium text-slate-700 select-none">
          {label}
        </span>
      )}
    </label>
  );
}
