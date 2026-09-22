import { CATALOG_TIER_LABELS, CATALOG_TIERS, type CatalogTier } from "@hogarplus/shared";

export type CatalogTierFilter = "ALL" | CatalogTier;

const TIER_ACCENT: Record<CatalogTier, string> = {
  A: "#B87333",
  B: "#8E9AA8",
  C: "#C4A04A",
};

type Props = {
  value: CatalogTierFilter;
  onChange: (value: CatalogTierFilter) => void;
  counts?: Partial<Record<CatalogTierFilter, number>>;
  variant?: "light" | "dark";
  className?: string;
};

export function CatalogTierTabs({ value, onChange, counts, variant = "light", className = "" }: Props) {
  const items: { id: CatalogTierFilter; label: string; accent?: string }[] = [
    { id: "ALL", label: "Todos" },
    ...CATALOG_TIERS.map((tier) => ({
      id: tier as CatalogTierFilter,
      label: CATALOG_TIER_LABELS[tier],
      accent: TIER_ACCENT[tier],
    })),
  ];

  const dark = variant === "dark";

  return (
    <div
      role="tablist"
      aria-label="Filtrar por categoría del catálogo"
      className={`inline-flex max-w-full flex-wrap gap-1 rounded-2xl p-1.5 ${
        dark ? "border border-white/10 bg-white/[0.04]" : "border border-slate-200/80 bg-slate-100/90"
      } ${className}`}
    >
      {items.map((item) => {
        const active = value === item.id;
        const count = counts?.[item.id];
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`relative inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
              active
                ? dark
                  ? "bg-white text-navy-950 shadow-sm"
                  : "bg-white text-navy-900 shadow-sm ring-1 ring-black/[0.04]"
                : dark
                  ? "text-slate-400 hover:bg-white/5 hover:text-white"
                  : "text-slate-500 hover:bg-white/60 hover:text-navy-800"
            }`}
          >
            {item.accent ? (
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.accent, boxShadow: active ? `0 0 0 3px ${item.accent}33` : undefined }}
                aria-hidden
              />
            ) : null}
            <span>{item.label}</span>
            {typeof count === "number" ? (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                  active
                    ? dark
                      ? "bg-navy-900/10 text-navy-900"
                      : "bg-slate-100 text-slate-600"
                    : dark
                      ? "bg-white/5 text-slate-500"
                      : "bg-white/80 text-slate-400"
                }`}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
