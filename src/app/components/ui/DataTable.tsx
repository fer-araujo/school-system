import { type ReactNode, useState } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export interface ColumnDef<T> {
  header: string | ReactNode;
  accessorKey?: keyof T;
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

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  if (currentPage > totalPages) {
    setCurrentPage(totalPages);
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);

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
          {/* CONTENEDOR CON SCROLL RESPONSIVO */}
          <div className="overflow-x-auto overflow-y-auto max-h-150">
            {/* Se agrega min-w-[800px] para forzar el ancho mínimo y evitar que se aplaste en iPad/Móvil */}
            <table className="w-full text-left border-collapse relative min-w-200">
              <thead className="bg-white/95 backdrop-blur-sm border-b border-slate-100 text-slate-400 text-xs font-medium uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                <tr>
                  {columns.map((col, index) => (
                    // whitespace-nowrap evita que los headers se partan en dos líneas
                    <th key={index} className={`p-4 whitespace-nowrap ${col.className || ""}`}>
                      {col.header}
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
                        // whitespace-nowrap evita que el contenido de las celdas se aplaste
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

          {/* CONTROLES DE PAGINACIÓN (FOOTER) */}
          <div className="border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
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
                Página <span className="font-medium text-slate-700">{currentPage}</span> de <span className="font-medium text-slate-700">{totalPages}</span>
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
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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