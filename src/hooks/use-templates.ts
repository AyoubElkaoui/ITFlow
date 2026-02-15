"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  TemplateCreateInput,
  TemplateUpdateInput,
} from "@/lib/validations";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: () => fetchJson("/api/templates"),
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ["template", id],
    queryFn: () => fetchJson(`/api/templates/${id}`),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TemplateCreateInput) =>
      fetchJson("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useUpdateTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TemplateUpdateInput) =>
      fetchJson(`/api/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      qc.invalidateQueries({ queryKey: ["template", id] });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/templates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}
