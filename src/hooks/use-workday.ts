"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { WorkDayCloseInput } from "@/lib/validations";
import type { ClockwiseFormat } from "@/lib/clockwise";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.message || err.error || "Request failed");
  }
  return res.json();
}

export interface WorkDayCompany {
  id: string;
  shortName: string;
  name: string;
  clockwiseCode: string | null;
}

export interface WorkDayAllocationDTO {
  companyId: string;
  company: WorkDayCompany;
  hours: number;
  description: string;
}

export interface WorkDayResponse {
  existing: boolean;
  date: string;
  start: string;
  netHours: number;
  status: "OPEN" | "CLOSED";
  pastedAt: string | null;
  allocations: WorkDayAllocationDTO[];
  format: ClockwiseFormat;
}

export function useWorkDay(date: string) {
  return useQuery<WorkDayResponse>({
    queryKey: ["workday", date],
    queryFn: () => fetchJson(`/api/workday?date=${date}`),
    enabled: !!date,
  });
}

export function useCloseWorkDay() {
  const qc = useQueryClient();
  return useMutation<WorkDayResponse, Error, WorkDayCloseInput>({
    mutationFn: (data) =>
      fetchJson("/api/workday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["workday", res.date] });
      qc.invalidateQueries({ queryKey: ["workday-overview"] });
    },
  });
}

// --- Week-/maandoverzicht ---

export type OverviewPeriod = "month" | "week";

export interface OverviewDay {
  date: string;
  status: "OPEN" | "CLOSED";
  netHours: number;
  allocatedHours: number;
  balanced: boolean;
}

export interface OverviewClient {
  companyId: string;
  company: WorkDayCompany;
  total: number;
  byDate: Record<string, { hours: number; description: string }>;
}

export interface WorkDayOverviewResponse {
  period: OverviewPeriod;
  anchor: string;
  from: string;
  to: string;
  days: OverviewDay[];
  clients: OverviewClient[];
  totals: {
    netHours: number;
    allocatedHours: number;
    closedDays: number;
    openDays: number;
    totalDays: number;
  };
  sanity: {
    ok: boolean;
    netHours: number;
    allocatedHours: number;
    diff: number;
  };
}

export function useWorkDayOverview(period: OverviewPeriod, anchor: string) {
  return useQuery<WorkDayOverviewResponse>({
    queryKey: ["workday-overview", period, anchor],
    queryFn: () =>
      fetchJson(`/api/workday/overview?period=${period}&anchor=${anchor}`),
    enabled: !!anchor,
  });
}
