import type { CatalogTier } from "@hogarplus/shared";

export type CatalogTierFilter = "ALL" | CatalogTier;

/** Metal tones: solid enough to read, soft enough not to shout */
export const TIER_TONE: Record<
  CatalogTier,
  { accent: string; soft: string; softText: string; ring: string; solid: string }
> = {
  A: {
    accent: "#B87333",
    soft: "bg-[#F4E8DC]",
    softText: "text-[#8B5429]",
    ring: "ring-[#B87333]/35",
    solid: "bg-[#B87333] text-white",
  },
  B: {
    accent: "#8E9AA8",
    soft: "bg-slate-200",
    softText: "text-slate-700",
    ring: "ring-slate-400/40",
    solid: "bg-[#8E9AA8] text-white",
  },
  C: {
    accent: "#C4A04A",
    soft: "bg-gold-100",
    softText: "text-[#7A6520]",
    ring: "ring-gold-400/45",
    solid: "bg-[#C4A04A] text-navy-950",
  },
};
