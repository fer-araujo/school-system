import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export default function renderSortIcon(
  index: number,
  sortConfig: {
    columnIndex: number | null;
    direction: "asc" | "desc" | null;
  },
) {
  if (sortConfig.columnIndex !== index) {
    return (
      <ArrowUpDown
        size={14}
        className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    );
  }
  return sortConfig.direction === "asc" ? (
    <ArrowUp size={14} className="text-blue-500" />
  ) : (
    <ArrowDown size={14} className="text-blue-500" />
  );
}
