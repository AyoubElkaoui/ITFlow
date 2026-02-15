"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CompanyCreateInput, CompanyUpdateInput } from "@/lib/validations";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export function useCompanies(search?: string, active?: boolean) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (active !== undefined) params.set("active", String(active));

  return useQuery({
    queryKey: ["companies", search, active],
    queryFn: () => fetchJson(`/api/companies?${params}`),
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: ["company", id],
    queryFn: () => fetchJson(`/api/companies/${id}`),
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CompanyCreateInput) =>
      fetchJson("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}

export function useUpdateCompany(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CompanyUpdateInput) =>
      fetchJson(`/api/companies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      qc.invalidateQueries({ queryKey: ["company", id] });
    },
  });
}
