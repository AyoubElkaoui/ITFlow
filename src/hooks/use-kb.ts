"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  KbArticleCreateInput,
  KbArticleUpdateInput,
  KbCategoryCreateInput,
  KbCategoryUpdateInput,
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
// Articles
// ---------------------------------------------------------------------------

interface ArticleFilters {
  search?: string;
  categoryId?: string;
  published?: boolean;
  page?: number;
  pageSize?: number;
}

export function useKbArticles(filters?: ArticleFilters) {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.categoryId) params.set("categoryId", filters.categoryId);
  if (filters?.published !== undefined)
    params.set("published", String(filters.published));
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.pageSize) params.set("pageSize", String(filters.pageSize));

  const qs = params.toString();
  const url = `/api/kb/articles${qs ? `?${qs}` : ""}`;

  return useQuery({
    queryKey: ["kb-articles", filters],
    queryFn: () => fetchJson(url),
  });
}

export function useKbArticle(id: string) {
  return useQuery({
    queryKey: ["kb-article", id],
    queryFn: () => fetchJson(`/api/kb/articles/${id}`),
    enabled: !!id,
  });
}

export function useCreateArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: KbArticleCreateInput) =>
      fetchJson("/api/kb/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kb-articles"] });
      qc.invalidateQueries({ queryKey: ["kb-categories"] });
    },
  });
}

export function useUpdateArticle(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: KbArticleUpdateInput) =>
      fetchJson(`/api/kb/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kb-articles"] });
      qc.invalidateQueries({ queryKey: ["kb-article", id] });
      qc.invalidateQueries({ queryKey: ["kb-categories"] });
    },
  });
}

export function useDeleteArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/kb/articles/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kb-articles"] });
      qc.invalidateQueries({ queryKey: ["kb-categories"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export function useKbCategories() {
  return useQuery({
    queryKey: ["kb-categories"],
    queryFn: () => fetchJson("/api/kb/categories"),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: KbCategoryCreateInput) =>
      fetchJson("/api/kb/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kb-categories"] });
    },
  });
}

export function useUpdateCategory(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: KbCategoryUpdateInput) =>
      fetchJson(`/api/kb/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kb-categories"] });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/kb/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kb-categories"] });
    },
  });
}
