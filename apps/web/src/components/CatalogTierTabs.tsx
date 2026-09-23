import { CATALOG_TIER_LABELS, CATALOG_TIERS, type CatalogTier } from "@hogarplus/shared";
import { TIER_TONE, type CatalogTierFilter } from "../lib/catalogTiers";

export type { CatalogTierFilter } from "../lib/catalogTiers";
export { TIER_TONE } from "../lib/catalogTiers";

type Props = {
  value: CatalogTierFilter;
  onChange: (value: CatalogTierFilter) => void;
  counts?: Partial<Record<CatalogTierFilter, number>>;
  variant?: "light" | "dark";
  className?: string;
};

export function CatalogTierTabs({ value, onChange, counts, variant = "light", className = "" }: Props) {
  const items: { id: CatalogTierFilter; label: string; tier?: CatalogTier }[] = [
    { id: "ALL", label: "Todos" },
    ...CATALOG_TIERS.map((tier) => ({
      id: tier as CatalogTierFilter,
      label: CATALOG_TIER_LABELS[tier],
      tier,
    })),
  ];

  const dark = variant === "dark";

  return (
    <div
      role="tablist"
      aria-label="Filtrar por categoría del catálogo"
      className={`inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl p-1 ${
        dark ? "border border-white/10 bg-white/[0.06]" : "border border-slate-200 bg-slate-100/80"
      } ${className}`}
    >
      {items.map((item) => {
        const active = value === item.id;
        const count = counts?.[item.id];
        const tone = item.tier ? TIER_TONE[item.tier] : null;

        let tabClass: string;
        if (active && tone) {
          tabClass = dark
            ? `${tone.solid} shadow-sm`
            : `${tone.soft} ${tone.softText} ring-1 ${tone.ring}`;
        } else if (active) {
          tabClass = dark ? "bg-white text-navy-950 shadow-sm" : "bg-navy-900 text-white shadow-sm";
        } else {
          tabClass = dark
            ? "text-slate-300 hover:bg-white/10 hover:text-white"
            : "text-slate-600 hover:bg-white hover:text-navy-900";
        }

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold transition ${tabClass}`}
          >
            {tone && !active ? (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: tone.accent }}
                aria-hidden
              />
            ) : null}
            <span>{item.label}</span>
            {typeof count === "number" ? (
              <span
                className={`min-w-[1.25rem] rounded-md px-1.5 text-center text-[11px] font-bold tabular-nums ${
                  active
                    ? dark && !tone
                      ? "bg-navy-900/10 text-navy-900"
                      : dark
                        ? "bg-black/15 text-inherit"
                        : "bg-white/70 text-inherit"
                    : dark
                      ? "bg-white/10 text-slate-400"
                      : "bg-white text-slate-500"
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
