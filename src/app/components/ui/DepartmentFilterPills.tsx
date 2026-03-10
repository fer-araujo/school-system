interface DepartmentFilterPillsProps {
  departments: string[];
  selectedDepartment: string;
  onSelect: (department: string) => void;
}

export default function DepartmentFilterPills({
  departments,
  selectedDepartment,
  onSelect,
}: DepartmentFilterPillsProps) {
  if (!departments || departments.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {departments.map((dep) => (
        <button
          key={dep}
          onClick={() => onSelect(dep)}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border cursor-pointer ${
            selectedDepartment === dep
              ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
          }`}
        >
          {dep}
        </button>
      ))}
    </div>
  );
}
