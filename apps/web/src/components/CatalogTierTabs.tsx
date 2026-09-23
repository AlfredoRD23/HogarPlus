import { CATALOG_TIER_LABELS, CATALOG_TIERS, type CatalogTier } from "@hogarplus/shared";
import { TIER_TONE, type CatalogTierFilter } from "../lib/catalogTiers";

export type { CatalogTierFilter } from "../lib/catalogTiers";
export { TIER_TONE } from "../lib/catalogTiers";

type Props = {
  value: CatalogTierFilter;
  onChange: (value: CatalogTierFilter) => void;
  counts?: Partial<Record<CatalogTierFilter, number>>;
  /** @deprecated dark track removed; kept for call-site compatibility */
  variant?: "light" | "dark";
  className?: string;
};

export function CatalogTierTabs({ value, onChange, counts, className = "" }: Props) {
  const items: { id: CatalogTierFilter; label: string; tier?: CatalogTier }[] = [
    { id: "ALL", label: "Todos" },
    ...CATALOG_TIERS.map((tier) => ({
      id: tier as CatalogTierFilter,
      label: CATALOG_TIER_LABELS[tier],
      tier,
    })),
  ];

  return (
    <div
      role="tablist"
      aria-label="Filtrar por categoría del catálogo"
      className={`flex max-w-full gap-1 overflow-x-auto pb-0.5 ${className}`}
    >
      {items.map((item) => {
        const active = value === item.id;
        const count = counts?.[item.id];
        const tone = item.tier ? TIER_TONE[item.tier] : null;

        let tabClass: string;
        if (active && tone) {
          tabClass = `${tone.soft} ${tone.softText} ring-1 ${tone.ring}`;
        } else if (active) {
          tabClass = "bg-navy-900 text-white";
        } else {
          tabClass = "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-navy-800";
        }

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition ${tabClass}`}
          >
            {tone ? (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: tone.accent }}
                aria-hidden
              />
            ) : null}
            <span>{item.label}</span>
            {typeof count === "number" ? (
              <span
                className={`min-w-[1.25rem] rounded-full px-1.5 text-center text-[11px] font-bold tabular-nums ${
                  active && !tone
                    ? "bg-white/15 text-white"
                    : active && tone
                      ? "bg-white/70 text-inherit"
                      : "bg-slate-100 text-slate-500"
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
