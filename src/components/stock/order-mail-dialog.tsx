"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, Loader2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface OrderRow {
  id: string;
  name: string;
  quantity: number;
  minStock: number;
  unit: string | null;
}
interface Preview {
  op: OrderRow[];
  bijnaOp: OrderRow[];
  to: string;
  date: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderMailDialog({ open, onOpenChange }: Props) {
  const [sending, setSending] = useState(false);

  const { data, isLoading } = useQuery<Preview>({
    queryKey: ["order-mail-preview"],
    queryFn: async () => {
      const res = await fetch("/api/stock/order-mail");
      if (!res.ok) throw new Error("Preview mislukt");
      return res.json();
    },
    enabled: open,
  });

  const total = (data?.op.length ?? 0) + (data?.bijnaOp.length ?? 0);

  async function send() {
    setSending(true);
    try {
      const res = await fetch("/api/stock/order-mail", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Versturen mislukt");
      toast.success(`Bestellijst verstuurd naar ${body.to}`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Versturen mislukt");
    } finally {
      setSending(false);
    }
  }

  function table(title: string, rows: OrderRow[], accent: string) {
    if (rows.length === 0) return null;
    return (
      <div>
        <h4 className={`mb-1.5 text-sm font-semibold ${accent}`}>
          {title} ({rows.length})
        </h4>
        <div className="rounded-lg border border-border divide-y divide-border">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-3 py-1.5 text-sm">
              <span className="truncate">{r.name}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {r.quantity}
                {r.unit ? ` ${r.unit}` : ""}
                {r.minStock > 0 && (
                  <span className="ml-2 text-xs">drempel {r.minStock}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Bestellijst mailen
          </DialogTitle>
          <DialogDescription>
            {data ? (
              <>
                Naar <span className="font-medium">{data.to}</span> · {data.date}
              </>
            ) : (
              "Voorbeeld van de bestellijst"
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Samenstellen...
          </div>
        ) : total === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Niets te bestellen — geen items op of bijna op.
          </p>
        ) : (
          <div className="space-y-4">
            {table("OP (aanvullen)", data!.op, "text-red-600")}
            {table("Bijna op", data!.bijnaOp, "text-orange-600")}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Badge variant="secondary">{total} items</Badge>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={send} disabled={sending || total === 0}>
            {sending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-4 w-4" />
            )}
            Verzenden
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
