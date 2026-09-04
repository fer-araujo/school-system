import type { ReactNode } from "react";

export type StatCardAccent =
  | "blue"
  | "emerald"
  | "amber"
  | "rose"
  | "orange";

// Full class strings only. Tailwind scans the source literally, so anything
// built by interpolation is never generated.
const ACCENTS: Record<
  StatCardAccent,
  { icon: string; badge: string; active: string }
> = {
  blue: {
    icon: "border-blue-100 text-blue-600",
    badge: "bg-blue-50 text-blue-600",
    active: "border-blue-300 ring-2 ring-blue-100",
  },
  emerald: {
    icon: "border-emerald-100 text-emerald-600",
    badge: "bg-emerald-50 text-emerald-600 border border-emerald-100/50",
    active: "border-emerald-300 ring-2 ring-emerald-100",
  },
  amber: {
    icon: "border-amber-200 text-amber-500",
    badge: "bg-amber-50 text-amber-600 border border-amber-100/50",
    active: "border-amber-300 ring-2 ring-amber-100",
  },
  rose: {
    icon: "border-rose-200 text-rose-500",
    badge: "bg-rose-50 text-rose-600 border border-rose-100/50",
    active: "border-rose-300 ring-2 ring-rose-100",
  },
  orange: {
    icon: "border-orange-200 text-orange-500",
    badge: "bg-orange-50 text-orange-600 border border-orange-100/50",
    active: "border-orange-300 ring-2 ring-orange-100",
  },
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  accent: StatCardAccent;
  /** Badge text or a custom node such as a progress bar. */
  footer?: ReactNode;
  valueClassName?: string;
  isLoading?: boolean;
  /** Makes the card a button. Omit for a static card. */
  onClick?: () => void;
  isActive?: boolean;
}

export default function StatCard({
  label,
  value,
  icon,
  accent,
  footer,
  valueClassName = "text-slate-800",
  isLoading,
  onClick,
  isActive,
}: StatCardProps) {
  const palette = ACCENTS[accent];

  const body = (
    <>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            {label}
          </p>
          <h3
            className={`text-4xl font-semibold tracking-tight ${valueClassName}`}
          >
            {isLoading ? "..." : value}
          </h3>
        </div>
        <div className={`p-2.5 rounded-xl border bg-white ${palette.icon}`}>
          {icon}
        </div>
      </div>
      {footer !== undefined && (
        <div className="mt-auto w-full">
          {typeof footer === "string" ? (
            <span
              className={`inline-block px-2.5 py-1 rounded text-[11px] font-medium ${palette.badge}`}
            >
              {footer}
            </span>
          ) : (
            footer
          )}
        </div>
      )}
    </>
  );

  const base =
    "bg-white rounded-[20px] p-6 border shadow-xs flex flex-col justify-between h-40 text-left w-full transition-all";

  if (!onClick) {
    return <div className={`${base} border-slate-200`}>{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`${base} cursor-pointer hover:border-slate-300 ${
        isActive ? palette.active : "border-slate-200"
      }`}
    >
      {body}
    </button>
  );
}
