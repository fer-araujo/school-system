import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Si solo hay una página, no mostramos los controles
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-2 py-4 mt-2 border-t border-slate-100">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="text-xs font-medium text-slate-600 disabled:opacity-40 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1"
      >
        <ChevronLeft size={14} /> Anterior
      </button>
      <span className="text-xs text-slate-500 font-medium">
        Página {currentPage} de {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="text-xs font-medium text-slate-600 disabled:opacity-40 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1"
      >
        Siguiente <ChevronRight size={14} />
      </button>
    </div>
  );
}
