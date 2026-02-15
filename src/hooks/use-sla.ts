"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  SlaPolicyCreateInput,
  SlaPolicyUpdateInput,
} from "@/lib/validations";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export function useSlaPolicies() {
  return useQuery({
    queryKey: ["sla-policies"],
    queryFn: () => fetchJson("/api/sla"),
  });
}

export function useSlaPolicy(id: string) {
  return useQuery({
    queryKey: ["sla-policy", id],
    queryFn: () => fetchJson(`/api/sla/${id}`),
    enabled: !!id,
  });
}

export function useCreateSla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SlaPolicyCreateInput) =>
      fetchJson("/api/sla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sla-policies"] });
    },
  });
}

export function useUpdateSla(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SlaPolicyUpdateInput) =>
      fetchJson(`/api/sla/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sla-policies"] });
      qc.invalidateQueries({ queryKey: ["sla-policy", id] });
    },
  });
}

export function useDeleteSla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/sla/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sla-policies"] });
    },
  });
}
