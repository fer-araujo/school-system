import { Link, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

interface NavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  isCollapsed?: boolean;
  end?: boolean;
}

export default function NavItem({
  to,
  icon: Icon,
  label,
  isCollapsed = false,
  end,
}: NavItemProps) {
  const location = useLocation();

  // Validación estricta y manual de la ruta actual
  const isActive = end
    ? location.pathname === to
    : location.pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-xl transition-all duration-200 group relative ${
        isActive
          ? "bg-blue-600/10 text-blue-400 font-medium shadow-sm" // Resalte más obvio
          : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
      } ${isCollapsed ? "justify-center p-3" : "px-4 py-3"}`}
      title={isCollapsed ? label : undefined}
    >
      <Icon
        className={`shrink-0 ${isCollapsed ? "w-6 h-6" : "w-5 h-5"} transition-all duration-200`}
      />

      <span
        className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${
          isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}
