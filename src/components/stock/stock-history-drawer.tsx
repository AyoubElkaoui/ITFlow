"use client";

import { format } from "date-fns";
import { useStockMovements } from "@/hooks/use-stock";
import { Link } from "@/i18n/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

interface Movement {
  id: string;
  type: "IN" | "OUT";
  quantity: number;
  reason: "INKOOP" | "UITGIFTE" | "TICKET" | "CORRECTIE" | null;
  note: string | null;
  createdAt: string;
  company: { id: string; shortName: string } | null;
  ticket: { id: string; ticketNumber: number; subject: string } | null;
  user: { id: string; name: string } | null;
}

const reasonLabel: Record<string, string> = {
  INKOOP: "Inkoop",
  UITGIFTE: "Uitgifte",
  TICKET: "Ticket",
  CORRECTIE: "Correctie",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockItemId: string;
  stockItemName: string;
}

export function StockHistoryDrawer({
  open,
  onOpenChange,
  stockItemId,
  stockItemName,
}: Props) {
  const { data, isLoading } = useStockMovements(open ? stockItemId : "");
  const movements = (data as Movement[] | undefined) ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{stockItemName}</SheetTitle>
          <SheetDescription>Voorraadhistorie (nieuwste eerst)</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2 px-4 pb-4">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded bg-muted" />
            ))
          ) : movements.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nog geen mutaties.
            </p>
          ) : (
            movements.map((m) => {
              const signed = m.type === "IN" ? `+${m.quantity}` : `-${m.quantity}`;
              return (
                <div
                  key={m.id}
                  className="flex items-start gap-3 rounded-lg border border-border p-2.5 text-sm"
                >
                  <span
                    className={`w-12 shrink-0 text-right font-semibold tabular-nums ${
                      m.type === "IN" ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {signed}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="text-xs">
                        {m.reason ? reasonLabel[m.reason] : m.type}
                      </Badge>
                      {m.ticket && (
                        <Link
                          href={`/tickets/${m.ticket.id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          #{String(m.ticket.ticketNumber).padStart(3, "0")}
                        </Link>
                      )}
                      {m.company && (
                        <span className="text-xs text-muted-foreground">
                          {m.company.shortName}
                        </span>
                      )}
                    </div>
                    {m.note && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{m.note}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {format(new Date(m.createdAt), "dd MMM HH:mm")}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
