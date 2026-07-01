"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export interface TicketMaterial {
  id: string;
  stockItemId: string;
  quantity: number;
  note: string | null;
  createdAt: string;
  stockItem: {
    id: string;
    name: string;
    unit: string | null;
    quantity: number;
    minStock: number;
  };
  user: { id: string; name: string } | null;
}

export function useTicketMaterials(ticketId: string) {
  return useQuery<TicketMaterial[]>({
    queryKey: ["ticket-materials", ticketId],
    queryFn: () => fetchJson(`/api/tickets/${ticketId}/materials`),
    enabled: !!ticketId,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, ticketId: string) {
  qc.invalidateQueries({ queryKey: ["ticket-materials", ticketId] });
  qc.invalidateQueries({ queryKey: ["stock-items"] });
  qc.invalidateQueries({ queryKey: ["stock-item"] });
}

export function useAddMaterial(ticketId: string) {
  const qc = useQueryClient();
  return useMutation<
    TicketMaterial,
    Error,
    { stockItemId: string; quantity: number; note?: string }
  >({
    mutationFn: (data) =>
      fetchJson(`/api/tickets/${ticketId}/materials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidate(qc, ticketId),
  });
}

export function useUpdateMaterial(ticketId: string) {
  const qc = useQueryClient();
  return useMutation<
    TicketMaterial,
    Error,
    { movementId: string; quantity: number; note?: string | null }
  >({
    mutationFn: ({ movementId, ...data }) =>
      fetchJson(`/api/tickets/${ticketId}/materials/${movementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidate(qc, ticketId),
  });
}

export function useDeleteMaterial(ticketId: string) {
  const qc = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (movementId) =>
      fetchJson(`/api/tickets/${ticketId}/materials/${movementId}`, {
        method: "DELETE",
      }),
    onSuccess: () => invalidate(qc, ticketId),
  });
}
