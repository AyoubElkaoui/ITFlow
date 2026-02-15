"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CustomFieldDefinitionCreateInput,
  CustomFieldDefinitionUpdateInput,
  CustomFieldValueSaveInput,
} from "@/lib/validations";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Field Definitions
// ---------------------------------------------------------------------------

export function useFieldDefinitions(entityType?: string) {
  const qs = entityType ? `?entityType=${entityType}` : "";
  return useQuery({
    queryKey: ["custom-field-definitions", entityType ?? "all"],
    queryFn: () => fetchJson(`/api/custom-fields/definitions${qs}`),
  });
}

export function useFieldDefinition(id: string) {
  return useQuery({
    queryKey: ["custom-field-definition", id],
    queryFn: () => fetchJson(`/api/custom-fields/definitions/${id}`),
    enabled: !!id,
  });
}

export function useCreateFieldDef() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CustomFieldDefinitionCreateInput) =>
      fetchJson("/api/custom-fields/definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-field-definitions"] });
    },
  });
}

export function useUpdateFieldDef(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CustomFieldDefinitionUpdateInput) =>
      fetchJson(`/api/custom-fields/definitions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-field-definitions"] });
      qc.invalidateQueries({ queryKey: ["custom-field-definition", id] });
    },
  });
}

export function useDeleteFieldDef() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/custom-fields/definitions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-field-definitions"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Field Values
// ---------------------------------------------------------------------------

export function useFieldValues(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ["custom-field-values", entityType, entityId],
    queryFn: () =>
      fetchJson(
        `/api/custom-fields/values?entityType=${entityType}&entityId=${entityId}`,
      ),
    enabled: !!entityType && !!entityId,
  });
}

export function useSaveFieldValues(entityType: string, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CustomFieldValueSaveInput) =>
      fetchJson(
        `/api/custom-fields/values?entityType=${entityType}&entityId=${entityId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["custom-field-values", entityType, entityId],
      });
    },
  });
}
