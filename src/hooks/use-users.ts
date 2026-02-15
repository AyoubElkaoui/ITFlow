"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserCreateInput, UserUpdateInput } from "@/lib/validations";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => fetchJson("/api/users"),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => fetchJson(`/api/users/${id}`),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UserCreateInput) =>
      fetchJson("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UserUpdateInput) =>
      fetchJson(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["user", id] });
    },
  });
}

export function useResetPassword(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { password: string }) =>
      fetchJson(`/api/users/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["user", id] });
    },
  });
}
