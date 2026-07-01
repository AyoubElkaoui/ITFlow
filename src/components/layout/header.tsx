"use client";

import {
  Moon,
  Sun,
  Search,
  Ticket,
  Building2,
  Users,
  Monitor,
  BookOpen,
  ArrowRight,
  Loader2,
  LogOut,
} from "lucide-react";
import { NotificationBell } from "@/components/layout/notification-bell";
import { useTheme } from "next-themes";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useEffect, useState, useRef, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import {
  SEARCH_GROUPS,
  type SearchType,
  type SearchResult,
  type SearchResponse,
} from "@/types/search";

const EMPTY_RESULTS: Record<SearchType, SearchResult[]> = {
  TICKET: [],
  KB: [],
  ASSET: [],
  CLIENT: [],
  CONTACT: [],
};

const GROUP_ICON: Record<SearchType, LucideIcon> = {
  TICKET: Ticket,
  KB: BookOpen,
  ASSET: Monitor,
  CLIENT: Building2,
  CONTACT: Users,
};

export function Header() {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const t = useTranslations("search");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] =
    useState<Record<SearchType, SearchResult[]>>(EMPTY_RESULTS);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName,
        ) &&
        !(e.target as HTMLElement).isContentEditable
      ) {
        e.preventDefault();
        setOpen(true);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(EMPTY_RESULTS);
      setLoading(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    }
  }, [open]);

  const fetchResults = useCallback(async (searchQuery: string) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();

    if (searchQuery.trim().length < 2) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);

    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery.trim())}`,
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      const data = (await res.json()) as SearchResponse;
      if (controller.signal.aborted) return;
      setResults(data.results ?? EMPTY_RESULTS);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("Search failed:", err);
      setResults(EMPTY_RESULTS);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchResults(value), 300);
    },
    [fetchResults],
  );

  const handleSelect = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router],
  );

  function toggleLocale() {
    const newLocale = locale === "nl" ? "en" : "nl";
    router.replace(pathname, { locale: newLocale });
  }

  const hasResults = Object.values(results).some((arr) => arr.length > 0);
  const hasQuery = query.trim().length > 0;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 md:gap-4 border-b border-border bg-card px-3 md:px-6">
      {/* Search trigger */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("placeholder")}
          className="pl-9 bg-background cursor-pointer text-sm"
          readOnly
          onClick={() => setOpen(true)}
          onFocus={(e) => {
            e.target.blur();
            setOpen(true);
          }}
        />
      </div>

      {/* Command palette dialog */}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t("title")}
        description={t("description")}
        showCloseButton={false}
      >
        <CommandInput
          placeholder={t("inputPlaceholder")}
          value={query}
          onValueChange={handleQueryChange}
        />
        <CommandList>
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("searching")}
            </div>
          )}

          {!loading && hasQuery && !hasResults && (
            <CommandEmpty>{t("noResults")}</CommandEmpty>
          )}

          {!loading && !hasQuery && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t("typeToSearch")}
            </div>
          )}

          {!loading &&
            SEARCH_GROUPS.map(({ type, labelNl, labelEn }) => {
              const items = results[type];
              if (!items || items.length === 0) return null;
              const Icon = GROUP_ICON[type];
              const heading = locale === "nl" ? labelNl : labelEn;
              return (
                <CommandGroup key={type} heading={heading}>
                  {items.map((r) => (
                    <CommandItem
                      key={`${type}-${r.id}`}
                      value={`${type}-${r.id}-${r.title}`}
                      onSelect={() => handleSelect(r.url)}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
                        <span className="truncate">{r.title}</span>
                        {(r.snippet || r.subtitle) && (
                          <span className="truncate text-xs text-muted-foreground">
                            {r.snippet || r.subtitle}
                          </span>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="ml-auto shrink-0 text-[10px]"
                      >
                        {heading}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}

          {!loading && hasQuery && hasResults && (
            <CommandGroup>
              <CommandItem
                value="__all_results__"
                onSelect={() =>
                  handleSelect(`/search?q=${encodeURIComponent(query.trim())}`)
                }
              >
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                {t("allResults", { q: query.trim() })}
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>

      <div className="flex items-center gap-1 md:gap-2 ml-auto">
        {/* Notifications */}
        <NotificationBell />

        {/* Language toggle — hidden on mobile */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleLocale}
          className="hidden md:flex"
          title={
            locale === "nl" ? "Switch to English" : "Schakel naar Nederlands"
          }
        >
          <span className="text-xs font-bold uppercase">
            {locale === "nl" ? "EN" : "NL"}
          </span>
        </Button>

        {/* Theme toggle — hidden on mobile */}
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        )}

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity">
              {session?.user?.name?.charAt(0).toUpperCase() ?? "?"}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{session?.user?.name}</p>
              <p className="text-xs text-muted-foreground">
                {session?.user?.email}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ redirectTo: "/login" })}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {tc("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
