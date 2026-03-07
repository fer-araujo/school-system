import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export type DateRange = { start: string; end: string };
type DatePickerMode = "single" | "range";

interface CustomDatePickerProps {
  mode?: DatePickerMode;
  value?: string | DateRange;
  onChange: (val: string | DateRange) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  isDateDisabled?: (dateStr: string) => boolean;
  required?: boolean;
  name?: string;
  error?: string;
}

const parseDateStr = (str: string) => {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const formatDateObj = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const DAY_NAMES = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];

export default function CustomDatePicker({
  mode = "single",
  value,
  onChange,
  placeholder = "Seleccionar fecha...",
  disabled = false,
  minDate,
  maxDate,
  isDateDisabled,
  required = false,
  name,
  error,
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [viewDate, setViewDate] = useState(new Date());

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
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
      if (mode === "single" && typeof value === "string" && value) {
        const d = parseDateStr(value);
        if (d) setViewDate(d);
      } else if (
        mode === "range" &&
        typeof value === "object" &&
        value?.start
      ) {
        const d = parseDateStr(value.start);
        if (d) setViewDate(d);
      } else {
        setViewDate(new Date());
      }
    }
    setIsOpen(!isOpen);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handleDayClick = (
    e: React.MouseEvent,
    dateStr: string,
    isDayDisabled: boolean,
  ) => {
    e.stopPropagation();
    if (isDayDisabled) return;

    if (mode === "single") {
      onChange(dateStr);
      setIsOpen(false);
    } else {
      const currentRange = (value as DateRange) || { start: "", end: "" };
      if (!currentRange.start || (currentRange.start && currentRange.end)) {
        onChange({ start: dateStr, end: "" });
      } else if (currentRange.start && !currentRange.end) {
        if (dateStr < currentRange.start) {
          onChange({ start: dateStr, end: "" });
        } else {
          onChange({ start: currentRange.start, end: dateStr });
          setIsOpen(false);
        }
      }
    }
  };

  const renderDisplayValue = () => {
    if (mode === "single") {
      return value ? (
        String(value)
      ) : (
        <span className="text-slate-400">{placeholder}</span>
      );
    } else {
      const range = value as DateRange;
      if (!range?.start && !range?.end)
        return <span className="text-slate-400">{placeholder}</span>;
      if (range.start && !range.end)
        return (
          <span className="text-slate-700">
            {range.start} - (Selecciona el fin)
          </span>
        );
      return (
        <span className="text-slate-700 font-medium">
          {range.start} / {range.end}
        </span>
      );
    }
  };

  const isSelected = (dayStr: string) => {
    if (mode === "single") return value === dayStr;
    const range = value as DateRange;
    return range?.start === dayStr || range?.end === dayStr;
  };

  const isInRange = (dayStr: string) => {
    if (mode === "single") return false;
    const range = value as DateRange;
    return Boolean(
      range?.start && range?.end && dayStr > range.start && dayStr < range.end,
    );
  };

  const checkIsDisabled = (dateStr: string) => {
    if (minDate && dateStr < minDate) return true;
    if (maxDate && dateStr > maxDate) return true;
    if (isDateDisabled && isDateDisabled(dateStr)) return true;
    return false;
  };

  const getInputValue = () => {
    if (!value) return "";
    if (mode === "single") return value as string;
    const range = value as DateRange;
    return range.start && range.end ? `${range.start},${range.end}` : "";
  };

  return (
    <div className="w-full relative">
      {/* 🌟 LA MAGIA DEL REQUIRED */}
      <input
        type="text"
        name={name}
        required={required}
        value={getInputValue()}
        onChange={() => {}}
        onFocus={() => {
          if (!disabled) setIsOpen(true);
        }}
        className="opacity-0 absolute inset-0 w-full h-full -z-10 pointer-events-none"
        tabIndex={-1}
      />

      <div
        ref={triggerRef}
        onClick={handleOpen}
        className={`relative flex items-center justify-between w-full bg-white border rounded-lg px-3 py-2 transition-all select-none ${
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
        <div className="flex items-center gap-2.5 flex-1 truncate text-sm">
          <CalendarIcon
            size={16}
            className={error ? "text-rose-400" : "text-slate-400 shrink-0"}
          />
          {renderDisplayValue()}
        </div>
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
            style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
            className="absolute z-100 w-70 bg-white border border-slate-200 shadow-xl rounded-xl p-3 animate-in fade-in zoom-in-95 origin-top-left duration-150 select-none"
          >
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewDate(new Date(year, month - 1, 1));
                }}
                className="p-1 hover:bg-slate-100 rounded-md text-slate-500"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-semibold text-slate-700">
                {MONTH_NAMES[month]} {year}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewDate(new Date(year, month + 1, 1));
                }}
                className="p-1 hover:bg-slate-100 rounded-md text-slate-500"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAY_NAMES.map((d) => (
                <div
                  key={d}
                  className="text-center text-[11px] font-semibold text-slate-400 uppercase"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="w-8 h-8" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = formatDateObj(new Date(year, month, day));
                const todayStr = formatDateObj(new Date());
                const isToday = dateStr === todayStr;
                const selected = isSelected(dateStr);
                const inRange = isInRange(dateStr);
                const isDayDisabled = checkIsDisabled(dateStr);

                let bgClass =
                  "bg-transparent text-slate-700 hover:bg-slate-100";
                if (isDayDisabled)
                  bgClass = "text-slate-300 bg-slate-50/50 cursor-not-allowed";
                else if (selected)
                  bgClass =
                    "bg-blue-600 text-white shadow-md font-semibold hover:bg-blue-700";
                else if (inRange)
                  bgClass = "bg-blue-50 text-blue-800 rounded-none";

                return (
                  <div
                    key={day}
                    className={`flex items-center justify-center ${inRange ? "px-0" : "px-0.5"}`}
                  >
                    <button
                      onClick={(e) => handleDayClick(e, dateStr, isDayDisabled)}
                      disabled={isDayDisabled}
                      className={`w-8 h-8 flex items-center justify-center text-xs transition-all ${
                        !inRange ? "rounded-lg" : "w-full rounded-none"
                      } ${bgClass} ${isToday && !selected && !isDayDisabled ? "font-bold ring-1 ring-inset ring-slate-300" : ""}`}
                    >
                      {day}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
