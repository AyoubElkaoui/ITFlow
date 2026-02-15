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

interface AssetFilters {
  companyId?: string;
  status?: string;
  type?: string;
  search?: string;
}

interface AssetCreateInput {
  companyId: string;
  type?: "LAPTOP" | "DESKTOP" | "PRINTER" | "MONITOR" | "PHONE" | "NETWORK" | "OTHER";
  brand?: string;
  model?: string;
  name?: string;
  serialNumber?: string;
  purchaseDate?: Date | string;
  warrantyEnd?: Date | string;
  assignedTo?: string;
  status?: "ACTIVE" | "IN_REPAIR" | "STORED" | "RETIRED";
  notes?: string;
}

interface AssetUpdateInput {
  companyId?: string;
  type?: "LAPTOP" | "DESKTOP" | "PRINTER" | "MONITOR" | "PHONE" | "NETWORK" | "OTHER";
  brand?: string;
  model?: string;
  name?: string;
  serialNumber?: string;
  purchaseDate?: Date | string;
  warrantyEnd?: Date | string;
  assignedTo?: string;
  status?: "ACTIVE" | "IN_REPAIR" | "STORED" | "RETIRED";
  notes?: string;
}

export function useAssets(filters: AssetFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (filters.companyId) params.set("companyId", filters.companyId);

  return useQuery({
    queryKey: ["assets", filters],
    queryFn: () => fetchJson(`/api/assets?${params}`),
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: ["asset", id],
    queryFn: () => fetchJson(`/api/assets/${id}`),
    enabled: !!id,
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AssetCreateInput) =>
      fetchJson("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateAsset(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AssetUpdateInput) =>
      fetchJson(`/api/assets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      qc.invalidateQueries({ queryKey: ["asset", id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/assets/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
