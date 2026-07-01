"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TicketCreateInput, TicketUpdateInput } from "@/lib/validations";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

interface TicketFilters {
  search?: string;
  status?: string;
  priority?: string;
  companyId?: string;
  assignedToId?: string;
  source?: string; // OPDRACHT | INBOUND | OVERIG
  archived?: string; // "true" | "false" — weglaten = alles
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export function useTickets(filters: TicketFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.companyId) params.set("companyId", filters.companyId);
  if (filters.assignedToId) params.set("assignedToId", filters.assignedToId);
  if (filters.source) params.set("source", filters.source);
  if (filters.archived) params.set("archived", filters.archived);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));

  return useQuery({
    queryKey: ["tickets", filters],
    queryFn: () => fetchJson(`/api/tickets?${params}`),
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ["ticket", id],
    queryFn: () => fetchJson(`/api/tickets/${id}`),
    enabled: !!id,
  });
}

// Openstaande OPDRACHT-tickets ("ga doen"-lijst), gesorteerd op geplande datum.
export function useOpdrachten(assignedToId?: string) {
  const params = new URLSearchParams();
  if (assignedToId) params.set("assignedToId", assignedToId);
  return useQuery({
    queryKey: ["opdrachten", assignedToId ?? "all"],
    queryFn: () => fetchJson(`/api/tickets/opdrachten?${params}`),
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TicketCreateInput) =>
      fetchJson("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateTicket(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TicketUpdateInput) =>
      fetchJson(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["ticket", id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// Markeer een ticket als verwerkt (archivedAt) of zet het terug (null).
export function useArchiveTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      fetchJson(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archivedAt: archived ? new Date().toISOString() : null,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["kanban-tickets"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/tickets/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
