import { type ReactNode, useState, useMemo } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import renderSortIcon from "./SortIcon";

export interface ColumnDef<T> {
  header: string | ReactNode;
  accessorKey?: keyof T;
  sortable?: boolean;
  sortAccessor?: (row: T) => string | number;
  cell?: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  loadingText?: string;
  isEmpty?: boolean;
  emptyText?: string;
}

export default function DataTable<T>({
  columns,
  data,
  isLoading,
  loadingText = "Cargando datos...",
  isEmpty,
  emptyText = "No hay registros disponibles.",
}: DataTableProps<T>) {
  // --- ESTADOS DE PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // --- ESTADOS DE ORDENAMIENTO (SORTING) ---
  const [sortConfig, setSortConfig] = useState<{
    columnIndex: number | null;
    direction: "asc" | "desc" | null;
  }>({ columnIndex: null, direction: null });

  // --- LÓGICA DE ORDENAMIENTO ---
  const handleSort = (index: number, col: ColumnDef<T>) => {
    if (!col.sortable) return;

    let direction: "asc" | "desc" | null = "asc";
    if (sortConfig.columnIndex === index && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (
      sortConfig.columnIndex === index &&
      sortConfig.direction === "desc"
    ) {
      direction = null; // Quita el ordenamiento al 3er clic
    }

    setSortConfig({ columnIndex: direction ? index : null, direction });
  };

  // --- ORDENAR LOS DATOS ANTES DE PAGINAR ---
  const sortedData = useMemo(() => {
    if (sortConfig.columnIndex === null || !sortConfig.direction) return data;

    const col = columns[sortConfig.columnIndex];
    const sortFn =
      col.sortAccessor ||
      ((row: T) => (col.accessorKey ? row[col.accessorKey] : ""));

    return [...data].sort((a, b) => {
      const aValue = sortFn(a) as string | number;
      const bValue = sortFn(b) as string | number;

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig, columns]);

  // --- CÁLCULOS PAGINACIÓN ---
  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  if (currentPage > totalPages) {
    setCurrentPage(totalPages);
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mb-3 text-blue-500" />
          <p className="font-light text-sm">{loadingText}</p>
        </div>
      ) : isEmpty || data.length === 0 ? (
        <div className="text-center p-20 text-slate-400 font-light text-sm">
          {emptyText}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto overflow-y-auto max-h-150">
            <table className="w-full text-left border-collapse relative min-w-200">
              {/* ADIÓS UPPERCASE Y TEXT-XS. HOLA TEXT-SM Y FONT-SEMIBOLD */}
              <thead className="bg-white/95 backdrop-blur-sm border-b border-slate-100 tracking-wide sticky top-0 z-10 shadow-sm">
                <tr>
                  {columns.map((col, index) => (
                    <th
                      key={index}
                      className={`p-4 whitespace-nowrap ${col.className || ""} capitalize font-semibold text-sm text-slate-700/80`}
                    >
                      {col.sortable ? (
                        <button
                          onClick={() => handleSort(index, col)}
                          className="flex items-center gap-1.5 hover:text-slate-800 group transition-colors cursor-pointer focus:outline-none"
                        >
                          {col.header} {renderSortIcon(index, sortConfig)}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60 text-sm">
                {paginatedData.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="even:bg-slate-50/50 hover:bg-blue-50/50 transition-colors group"
                  >
                    {columns.map((col, colIndex) => (
                      <td
                        key={colIndex}
                        className={`p-4 align-middle whitespace-nowrap ${col.className || ""}`}
                      >
                        {col.cell
                          ? col.cell(row)
                          : col.accessorKey
                            ? String(row[col.accessorKey])
                            : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
            {/* Controles de paginación (Mantenidos igual) */}
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Mostrar</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>filas</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">
                Página{" "}
                <span className="font-medium text-slate-700">
                  {currentPage}
                </span>{" "}
                de{" "}
                <span className="font-medium text-slate-700">{totalPages}</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
