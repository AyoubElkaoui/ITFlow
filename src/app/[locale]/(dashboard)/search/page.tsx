"use client";

import { useTranslations, useLocale } from "next-intl";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  Search as SearchIcon,
  Ticket,
  Building2,
  Users,
  Monitor,
  BookOpen,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  SEARCH_GROUPS,
  type SearchType,
  type SearchResult,
  type SearchResponse,
} from "@/types/search";

const GROUP_ICON: Record<SearchType, LucideIcon> = {
  TICKET: Ticket,
  KB: BookOpen,
  ASSET: Monitor,
  CLIENT: Building2,
  CONTACT: Users,
};

const EMPTY: Record<SearchType, SearchResult[]> = {
  TICKET: [],
  KB: [],
  ASSET: [],
  CLIENT: [],
  CONTACT: [],
};

function SearchPageInner() {
  const t = useTranslations("search");
  const locale = useLocale();
  const params = useSearchParams();
  const initialQ = params.get("q") || "";

  const [query, setQuery] = useState(initialQ);
  const [results, setResults] = useState<Record<SearchType, SearchResult[]>>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(EMPTY);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&all=1`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as SearchResponse;
        if (!controller.signal.aborted) setResults(data.results ?? EMPTY);
      } catch {
        /* aborted */
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const total = Object.values(results).reduce((s, a) => s + a.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <SearchIcon className="h-6 w-6" />
          {t("title2")}
        </h1>
      </div>

      <div className="relative max-w-xl">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("inputPlaceholder")}
          className="pl-9"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("searching")}
        </div>
      )}

      {!loading && query.trim().length >= 2 && total === 0 && (
        <p className="text-sm text-muted-foreground">{t("noResults")}</p>
      )}

      {SEARCH_GROUPS.map(({ type, labelNl, labelEn }) => {
        const items = results[type];
        if (!items || items.length === 0) return null;
        const Icon = GROUP_ICON[type];
        const heading = locale === "nl" ? labelNl : labelEn;
        return (
          <Card key={type}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="h-4 w-4" />
                {heading}
                <Badge variant="secondary">{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {items.map((r) => (
                <Link
                  key={r.id}
                  href={r.url}
                  className="block rounded-lg border border-border px-3 py-2 hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate font-medium">{r.title}</span>
                    {r.subtitle && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {r.subtitle}
                      </span>
                    )}
                  </div>
                  {r.snippet && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {r.snippet}
                    </p>
                  )}
                </Link>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageInner />
    </Suspense>
  );
}
