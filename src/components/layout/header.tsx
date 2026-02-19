"use client";

import {
  Moon,
  Sun,
  Search,
  Ticket,
  Building2,
  Users,
  Loader2,
  Languages,
  LogOut,
} from "lucide-react";
import { NotificationBell } from "@/components/layout/notification-bell";
import { useTheme } from "next-themes";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface TicketResult {
  id: string;
  subject: string;
  status: string;
  company?: { id: string; name: string; shortName?: string } | null;
}

interface CompanyResult {
  id: string;
  name: string;
  shortName?: string | null;
}

interface ContactResult {
  id: string;
  name: string;
  email?: string | null;
  company?: { id: string; name: string; shortName?: string } | null;
}

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
  const [tickets, setTickets] = useState<TicketResult[]>([]);
  const [companies, setCompanies] = useState<CompanyResult[]>([]);
  const [contacts, setContacts] = useState<ContactResult[]>([]);

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
      setTickets([]);
      setCompanies([]);
      setContacts([]);
      setLoading(false);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
  }, [open]);

  const fetchResults = useCallback(async (searchQuery: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!searchQuery.trim()) {
      setTickets([]);
      setCompanies([]);
      setContacts([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);

    try {
      const encoded = encodeURIComponent(searchQuery.trim());

      const [ticketsRes, companiesRes, contactsRes] = await Promise.all([
        fetch(`/api/tickets?search=${encoded}&pageSize=5`, {
          signal: controller.signal,
        }),
        fetch(`/api/companies?search=${encoded}`, {
          signal: controller.signal,
        }),
        fetch(`/api/contacts?search=${encoded}`, {
          signal: controller.signal,
        }),
      ]);

      if (controller.signal.aborted) return;

      const ticketsData = await ticketsRes.json();
      const companiesData = await companiesRes.json();
      const contactsData = await contactsRes.json();

      if (controller.signal.aborted) return;

      setTickets(
        Array.isArray(ticketsData) ? ticketsData : ticketsData.data || [],
      );
      setCompanies(
        Array.isArray(companiesData) ? companiesData : companiesData.data || [],
      );
      setContacts(
        Array.isArray(contactsData) ? contactsData : contactsData.data || [],
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      console.error("Search failed:", err);
      setTickets([]);
      setCompanies([]);
      setContacts([]);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        fetchResults(value);
      }, 300);
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

  const hasResults =
    tickets.length > 0 || companies.length > 0 || contacts.length > 0;
  const hasQuery = query.trim().length > 0;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-card px-6">
      {/* Search trigger */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("placeholder")}
          className="pl-9 bg-background cursor-pointer"
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

          {!loading && tickets.length > 0 && (
            <CommandGroup heading={t("tickets")}>
              {tickets.map((ticket) => (
                <CommandItem
                  key={`ticket-${ticket.id}`}
                  value={`ticket-${ticket.id}-${ticket.subject}`}
                  onSelect={() => handleSelect(`/tickets/${ticket.id}`)}
                >
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    <span className="truncate">{ticket.subject}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {ticket.status}
                      {ticket.company ? ` - ${ticket.company.name}` : ""}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!loading && companies.length > 0 && (
            <CommandGroup heading={t("companies")}>
              {companies.map((company) => (
                <CommandItem
                  key={`company-${company.id}`}
                  value={`company-${company.id}-${company.name}`}
                  onSelect={() => handleSelect(`/companies/${company.id}`)}
                >
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    <span className="truncate">{company.name}</span>
                    {company.shortName && (
                      <span className="text-xs text-muted-foreground truncate">
                        {company.shortName}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!loading && contacts.length > 0 && (
            <CommandGroup heading={t("contacts")}>
              {contacts.map((contact) => (
                <CommandItem
                  key={`contact-${contact.id}`}
                  value={`contact-${contact.id}-${contact.name}`}
                  onSelect={() => handleSelect(`/contacts/${contact.id}`)}
                >
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    <span className="truncate">{contact.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {contact.email || ""}
                      {contact.company ? ` - ${contact.company.name}` : ""}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <NotificationBell />

        {/* Language toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleLocale}
          title={
            locale === "nl" ? "Switch to English" : "Schakel naar Nederlands"
          }
        >
          <span className="text-xs font-bold uppercase">
            {locale === "nl" ? "EN" : "NL"}
          </span>
        </Button>

        {/* Theme toggle */}
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
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
