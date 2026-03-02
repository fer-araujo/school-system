import type { LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface NavItemProps {
  to: string;
  icon: LucideIcon; // <--- El tipado estricto y correcto para los iconos
  label: string;
}

export default function NavItem({ to, icon: Icon, label }: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
        ${
          isActive
            ? "bg-blue-600/10 text-blue-400 font-semibold ring-1 ring-blue-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
            : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
        }`}
    >
      <Icon
        className={`w-5 h-5 transition-transform duration-300 ${
          isActive
            ? "scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
            : "group-hover:scale-110"
        }`}
      />
      {label}
    </Link>
  );
}
