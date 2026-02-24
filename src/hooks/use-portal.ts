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

interface PortalSession {
  contactName: string;
  companyName: string;
}

export function usePortalSession() {
  return useQuery({
    queryKey: ["portal-session"],
    queryFn: async (): Promise<PortalSession | null> => {
      try {
        // We get session info from the first successful API call
        // For now, read from a cookie-derived endpoint or localStorage
        const stored = sessionStorage.getItem("portal-session");
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    },
    staleTime: Infinity,
  });
}

export function setPortalSessionData(data: PortalSession) {
  sessionStorage.setItem("portal-session", JSON.stringify(data));
}

export function clearPortalSessionData() {
  sessionStorage.removeItem("portal-session");
}

interface PortalTicketFilters {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function usePortalTickets(filters: PortalTicketFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));

  return useQuery({
    queryKey: ["portal-tickets", filters],
    queryFn: () => fetchJson(`/api/portal/tickets?${params}`),
  });
}

export function usePortalTicket(id: string) {
  return useQuery({
    queryKey: ["portal-ticket", id],
    queryFn: () => fetchJson(`/api/portal/tickets/${id}`),
    enabled: !!id,
  });
}

export function usePortalTicketNotes(ticketId: string) {
  return useQuery({
    queryKey: ["portal-ticket-notes", ticketId],
    queryFn: () => fetchJson(`/api/portal/tickets/${ticketId}/notes`),
    enabled: !!ticketId,
  });
}

export function useCreatePortalTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      subject: string;
      description?: string;
      priority?: string;
      category?: string;
    }) =>
      fetchJson("/api/portal/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-tickets"] });
    },
  });
}

export function useCreatePortalNote(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      fetchJson(`/api/portal/tickets/${ticketId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-ticket-notes", ticketId] });
    },
  });
}

// Profile hooks
interface PortalProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  function: string | null;
  company: { name: string };
}

export function usePortalProfile() {
  return useQuery({
    queryKey: ["portal-profile"],
    queryFn: () => fetchJson<PortalProfile>("/api/portal/profile"),
  });
}

export function useUpdatePortalProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name?: string;
      phone?: string;
      currentPassword?: string;
      newPassword?: string;
    }) =>
      fetchJson("/api/portal/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-profile"] });
    },
  });
}
