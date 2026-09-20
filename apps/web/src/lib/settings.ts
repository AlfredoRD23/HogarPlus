import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export type AppSettings = {
  affiliationFee: number;
  weeklyQuota: number;
  defaultWeeks: number;
  cashReservePercent: number;
  companyName: string;
  companyCity: string;
};

export type PublicSettings = {
  companyName: string;
  companyCity: string;
  affiliationFee: number;
};

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => api<AppSettings>("/api/settings"),
    staleTime: 30_000,
  });
}

export function usePublicSettings() {
  return useQuery({
    queryKey: ["settings", "public"],
    queryFn: () => api<PublicSettings>("/api/settings/public"),
    staleTime: 60_000,
  });
}
