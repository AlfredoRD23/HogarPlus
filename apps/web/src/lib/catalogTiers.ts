import type { CatalogTier } from "@hogarplus/shared";

export type CatalogTierFilter = "ALL" | CatalogTier;

/** Soft metal tones shared by tabs and badges */
export const TIER_TONE: Record<
  CatalogTier,
  { accent: string; soft: string; softText: string; ring: string }
> = {
  A: {
    accent: "#B87333",
    soft: "bg-[#F4E8DC]",
    softText: "text-[#8B5429]",
    ring: "ring-[#B87333]/30",
  },
  B: {
    accent: "#8E9AA8",
    soft: "bg-slate-200",
    softText: "text-slate-700",
    ring: "ring-slate-300/70",
  },
  C: {
    accent: "#C4A04A",
    soft: "bg-gold-100",
    softText: "text-[#7A6520]",
    ring: "ring-gold-400/40",
  },
};

