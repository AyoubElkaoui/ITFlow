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

interface StockFilters {
  search?: string;
  category?: string;
  lowStock?: boolean;
}

interface StockItemCreateInput {
  name: string;
  category?:
    | "CABLE"
    | "ADAPTER"
    | "TONER"
    | "PERIPHERAL"
    | "COMPONENT"
    | "TOOL"
    | "OTHER";
  description?: string;
  sku?: string;
  quantity?: number;
  minStock?: number;
  location?: string;
  unitPrice?: number;
  notes?: string;
}

interface StockItemUpdateInput {
  name?: string;
  category?: string;
  description?: string;
  sku?: string;
  minStock?: number;
  location?: string;
  unitPrice?: number;
  notes?: string;
}

interface StockMovementCreateInput {
  type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number;
  note?: string;
  companyId?: string;
  ticketId?: string;
}

export function useStockItems(filters: StockFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.lowStock) params.set("lowStock", "true");

  return useQuery({
    queryKey: ["stock-items", filters],
    queryFn: () => fetchJson(`/api/stock?${params}`),
  });
}

export function useStockItem(id: string) {
  return useQuery({
    queryKey: ["stock-item", id],
    queryFn: () => fetchJson(`/api/stock/${id}`),
    enabled: !!id,
  });
}

export function useCreateStockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: StockItemCreateInput) =>
      fetchJson("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-items"] });
    },
  });
}

export function useUpdateStockItem(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: StockItemUpdateInput) =>
      fetchJson(`/api/stock/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-items"] });
      qc.invalidateQueries({ queryKey: ["stock-item", id] });
    },
  });
}

export function useDeleteStockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/stock/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-items"] });
    },
  });
}

export function useStockMovements(stockItemId: string) {
  return useQuery({
    queryKey: ["stock-movements", stockItemId],
    queryFn: () => fetchJson(`/api/stock/${stockItemId}/movements`),
    enabled: !!stockItemId,
  });
}

export function useCreateStockMovement(stockItemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: StockMovementCreateInput) =>
      fetchJson(`/api/stock/${stockItemId}/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-items"] });
      qc.invalidateQueries({ queryKey: ["stock-item", stockItemId] });
      qc.invalidateQueries({ queryKey: ["stock-movements", stockItemId] });
    },
  });
}
