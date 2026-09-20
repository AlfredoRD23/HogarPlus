import type { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  hint,
  tone = "navy",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "navy" | "gold" | "white";
}) {
  const tones = {
    navy: "bg-navy-900 text-white",
    gold: "bg-gold-100 text-navy-900",
    white: "bg-white text-navy-900",
  };

  return (
    <div className={`panel p-5 ${tones[tone]}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${tone === "navy" ? "text-gold-300" : "text-slate-500"}`}>
        {label}
      </p>
      <p className="mt-2 font-display text-2xl">{value}</p>
      {hint && <p className={`mt-2 text-xs ${tone === "navy" ? "text-slate-300" : "text-slate-500"}`}>{hint}</p>}
    </div>
  );
}
