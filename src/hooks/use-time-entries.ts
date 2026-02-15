"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TimeEntryCreateInput, TimeEntryUpdateInput } from "@/lib/validations";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

interface TimeFilters {
  companyId?: string;
  ticketId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export function useTimeEntries(filters: TimeFilters = {}) {
  const params = new URLSearchParams();
  if (filters.companyId) params.set("companyId", filters.companyId);
  if (filters.ticketId) params.set("ticketId", filters.ticketId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));

  return useQuery({
    queryKey: ["timeEntries", filters],
    queryFn: () => fetchJson(`/api/time?${params}`),
  });
}

export function useCreateTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TimeEntryCreateInput) =>
      fetchJson("/api/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timeEntries"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateTimeEntry(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TimeEntryUpdateInput) =>
      fetchJson(`/api/time/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timeEntries"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/time/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timeEntries"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
