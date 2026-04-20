interface ShiftFilterPillsProps {
  shiftsList: string[];
  selectedShift: string;
  onSelect: (shift: string) => void;
}

export default function ShiftFilterPills({
  shiftsList,
  selectedShift,
  onSelect,
}: ShiftFilterPillsProps) {
  if (!shiftsList || shiftsList.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {shiftsList.map((shift) => (
        <button
          key={shift}
          onClick={() => onSelect(shift)}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border cursor-pointer ${
            selectedShift === shift
              ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
          }`}
        >
          {shift}
        </button>
      ))}
    </div>
  );
}
