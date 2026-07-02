import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Ticket,
  ClipboardList,
  Receipt,
  Clock,
  CalendarCheck,
  Building2,
  Users,
  Monitor,
  Package,
  BarChart3,
  BookOpen,
  Shield,
  FileText,
  Timer,
  SlidersHorizontal,
  RefreshCw,
  ScrollText,
} from "lucide-react";

// ÉÉN bron voor alle nav (desktop-sidebar + mobiele bottom-bar). Nieuwe fases voeg
// je hier één keer toe en verschijnen automatisch overal.
export interface NavItem {
  nameKey: string; // key in de "nav" i18n-namespace
  href: string;
  icon: LucideIcon;
  // Vaste shortcut in de mobiele bottom-bar. Alles zonder primary belandt onder "Meer".
  primary?: boolean;
}

export const navItems: NavItem[] = [
  { nameKey: "dashboard", href: "/", icon: LayoutDashboard, primary: true },
  { nameKey: "tickets", href: "/tickets", icon: Ticket, primary: true },
  { nameKey: "opdrachten", href: "/tickets/opdrachten", icon: ClipboardList },
  { nameKey: "teFactureren", href: "/tickets/te-factureren", icon: Receipt },
  { nameKey: "time", href: "/time", icon: Clock, primary: true },
  { nameKey: "dagafsluiting", href: "/dagafsluiting", icon: CalendarCheck },
  { nameKey: "companies", href: "/companies", icon: Building2 },
  { nameKey: "contacts", href: "/contacts", icon: Users },
  { nameKey: "assets", href: "/assets", icon: Monitor },
  { nameKey: "stock", href: "/stock", icon: Package },
  { nameKey: "reports", href: "/reports", icon: BarChart3 },
  { nameKey: "kb", href: "/kb", icon: BookOpen },
];

export const adminItems: NavItem[] = [
  { nameKey: "users", href: "/admin/users", icon: Shield },
  { nameKey: "templates", href: "/admin/templates", icon: FileText },
  { nameKey: "sla", href: "/admin/sla", icon: Timer },
  { nameKey: "customFields", href: "/admin/custom-fields", icon: SlidersHorizontal },
  { nameKey: "recurring", href: "/admin/recurring", icon: RefreshCw },
  { nameKey: "audit", href: "/admin/audit", icon: ScrollText },
];

// Vaste bottom-bar-shortcuts (Home / Tickets / Uren). De "+" (nieuw ticket) is een
// aparte FAB in de bar; de rest van navItems belandt onder "Meer".
export const bottomBarItems = navItems.filter((i) => i.primary);
export const moreItems = navItems.filter((i) => !i.primary);
