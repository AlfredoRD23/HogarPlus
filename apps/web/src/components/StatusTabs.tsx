type StatusTab = "ACTIVE" | "INACTIVE";

export function StatusTabs({
  value,
  onChange,
  activeCount,
  inactiveCount,
  activeLabel = "Activos",
  inactiveLabel = "Inactivos",
}: {
  value: StatusTab;
  onChange: (value: StatusTab) => void;
  activeCount: number;
  inactiveCount: number;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
      {([
        ["ACTIVE", activeLabel, activeCount],
        ["INACTIVE", inactiveLabel, inactiveCount],
      ] as const).map(([id, label, count]) => (
        <button
          key={id}
          type="button"
          className={`h-10 flex-1 rounded-lg text-sm font-semibold sm:flex-none sm:px-5 ${
            value === id ? "bg-white text-navy-900 shadow-sm" : "text-slate-500"
          }`}
          onClick={() => onChange(id)}
        >
          {label} · {count}
        </button>
      ))}
    </div>
  );
}
