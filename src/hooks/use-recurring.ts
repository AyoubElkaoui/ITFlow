"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  RecurringTicketCreateInput,
  RecurringTicketUpdateInput,
} from "@/lib/validations";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export function useRecurringTickets() {
  return useQuery({
    queryKey: ["recurring-tickets"],
    queryFn: () => fetchJson("/api/recurring"),
  });
}

export function useRecurringTicket(id: string) {
  return useQuery({
    queryKey: ["recurring-ticket", id],
    queryFn: () => fetchJson(`/api/recurring/${id}`),
    enabled: !!id,
  });
}

export function useCreateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RecurringTicketCreateInput) =>
      fetchJson("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring-tickets"] });
    },
  });
}

export function useUpdateRecurring(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RecurringTicketUpdateInput) =>
      fetchJson(`/api/recurring/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring-tickets"] });
      qc.invalidateQueries({ queryKey: ["recurring-ticket", id] });
    },
  });
}

export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/recurring/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring-tickets"] });
    },
  });
}

export function useProcessRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchJson("/api/recurring/process", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring-tickets"] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}
