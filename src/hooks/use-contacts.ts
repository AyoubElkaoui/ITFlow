"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ContactCreateInput, ContactUpdateInput } from "@/lib/validations";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export function useContacts(companyId?: string, search?: string) {
  const params = new URLSearchParams();
  if (companyId) params.set("companyId", companyId);
  if (search) params.set("search", search);

  return useQuery({
    queryKey: ["contacts", companyId, search],
    queryFn: () => fetchJson(`/api/contacts?${params}`),
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ["contact", id],
    queryFn: () => fetchJson(`/api/contacts/${id}`),
    enabled: !!id,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ContactCreateInput) =>
      fetchJson("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["company"] });
    },
  });
}

export function useUpdateContact(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ContactUpdateInput) =>
      fetchJson(`/api/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", id] });
      qc.invalidateQueries({ queryKey: ["company"] });
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/contacts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["company"] });
    },
  });
}

export function useEnablePortalAccess(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { sendEmail?: boolean; password?: string }) =>
      fetchJson<{ success: boolean; password: string; emailSent: boolean; emailError?: string }>(
        `/api/contacts/${id}/portal-access`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", id] });
    },
  });
}

export function useDisablePortalAccess(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchJson(`/api/contacts/${id}/portal-access`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", id] });
    },
  });
}
