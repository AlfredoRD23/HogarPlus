import type { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  hint,
  tone = "white",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "navy" | "gold" | "white";
}) {
  const tones = {
    navy: "border-l-[3px] border-l-navy-900 bg-white text-navy-900",
    gold: "border-l-[3px] border-l-gold-500 bg-gold-50/60 text-navy-900",
    white: "bg-white text-navy-900",
  };

  return (
    <div className={`panel p-5 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 font-display text-2xl">{value}</p>
      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
