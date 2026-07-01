"use client";

import { useState } from "react";
import { useCreateStockMovement } from "@/hooks/use-stock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockItemId: string;
  stockItemName: string;
  currentQuantity: number;
}

// Bijboeken (INKOOP, +aantal) en Corrigeren (CORRECTIE, naar absoluut aantal).
export function StockAdjustDialog({
  open,
  onOpenChange,
  stockItemId,
  stockItemName,
  currentQuantity,
}: Props) {
  const createMovement = useCreateStockMovement(stockItemId);
  const [tab, setTab] = useState<"BIJBOEKEN" | "CORRECTIE">("BIJBOEKEN");
  const [amount, setAmount] = useState("1");
  const [target, setTarget] = useState(String(currentQuantity));
  const [note, setNote] = useState("");

  function reset() {
    setTab("BIJBOEKEN");
    setAmount("1");
    setTarget(String(currentQuantity));
    setNote("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (tab === "BIJBOEKEN") {
        const qty = parseInt(amount, 10);
        if (!qty || qty < 1) return;
        await createMovement.mutateAsync({
          type: "IN",
          quantity: qty,
          reason: "INKOOP",
          note: note || undefined,
        });
        toast.success(`+${qty} bijgeboekt`);
      } else {
        const targetQty = parseInt(target, 10);
        if (Number.isNaN(targetQty)) return;
        if (targetQty === currentQuantity) {
          toast.error("Doel is gelijk aan huidig aantal");
          return;
        }
        await createMovement.mutateAsync({
          reason: "CORRECTIE",
          targetQty,
          note: note || undefined,
        });
        toast.success(`Gecorrigeerd naar ${targetQty}`);
      }
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mislukt");
    }
  }

  const targetQtyNum = parseInt(target, 10);
  const delta = Number.isNaN(targetQtyNum) ? 0 : targetQtyNum - currentQuantity;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{stockItemName}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Huidig aantal:{" "}
          <span className={currentQuantity < 0 ? "font-medium text-red-600" : "font-medium"}>
            {currentQuantity}
          </span>
        </p>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "BIJBOEKEN" | "CORRECTIE")}>
          <TabsList className="w-full">
            <TabsTrigger value="BIJBOEKEN" className="flex-1 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Bijboeken
            </TabsTrigger>
            <TabsTrigger value="CORRECTIE" className="flex-1 gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Corrigeren
            </TabsTrigger>
          </TabsList>

          <form onSubmit={submit} className="mt-4 space-y-4">
            <TabsContent value="BIJBOEKEN" className="mt-0 space-y-2">
              <Label htmlFor="adjust-amount">Aantal bijboeken *</Label>
              <Input
                id="adjust-amount"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Nieuw aantal: {currentQuantity + (parseInt(amount, 10) || 0)}
              </p>
            </TabsContent>

            <TabsContent value="CORRECTIE" className="mt-0 space-y-2">
              <Label htmlFor="adjust-target">Nieuw totaal aantal *</Label>
              <Input
                id="adjust-target"
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Correctie-mutatie: {delta > 0 ? `+${delta}` : delta}
                {targetQtyNum < 0 && (
                  <span className="ml-1 text-red-600">(negatieve voorraad)</span>
                )}
              </p>
            </TabsContent>

            <div className="space-y-2">
              <Label htmlFor="adjust-note">Notitie</Label>
              <Textarea
                id="adjust-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={createMovement.isPending}>
                {createMovement.isPending ? "Opslaan..." : "Opslaan"}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
