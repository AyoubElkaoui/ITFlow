"use client";

import { useTranslations } from "next-intl";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompanySelect } from "@/components/shared/company-select";
import { toast } from "sonner";

type MovementType = "IN" | "OUT" | "ADJUSTMENT";

interface StockMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockItemId: string;
  stockItemName: string;
  currentQuantity: number;
}

export function StockMovementDialog({
  open,
  onOpenChange,
  stockItemId,
  stockItemName,
  currentQuantity,
}: StockMovementDialogProps) {
  const t = useTranslations("stock");
  const tc = useTranslations("common");
  const createMovement = useCreateStockMovement(stockItemId);

  const [type, setType] = useState<MovementType>("IN");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [ticketId, setTicketId] = useState("");

  function resetForm() {
    setType("IN");
    setQuantity("");
    setNote("");
    setCompanyId("");
    setTicketId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseInt(quantity);
    if (!qty || qty < 1) return;

    try {
      await createMovement.mutateAsync({
        type,
        quantity: qty,
        note: note || undefined,
        companyId: companyId || undefined,
        ticketId: ticketId || undefined,
      });
      toast.success(t("movementCreated"));
      resetForm();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed";
      if (message.includes("Insufficient")) {
        toast.error(t("insufficientStock"));
      } else {
        toast.error(message);
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("addMovement")} — {stockItemName}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t("quantity")}: <span className="font-medium">{currentQuantity}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("movementType")}</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as MovementType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN">{t("IN")}</SelectItem>
                <SelectItem value="OUT">{t("OUT")}</SelectItem>
                <SelectItem value="ADJUSTMENT">{t("ADJUSTMENT")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="movement-qty">
              {type === "ADJUSTMENT" ? t("quantity") + " (nieuw)" : t("movementQuantity")} *
            </Label>
            <Input
              id="movement-qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="movement-note">{t("movementNote")}</Label>
            <Textarea
              id="movement-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("movementCompany")}</Label>
            <CompanySelect
              value={companyId || undefined}
              onValueChange={(v) => setCompanyId(v === "all" ? "" : v)}
              placeholder={tc("selectCompany")}
              allowAll
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="movement-ticket">{t("movementTicket")}</Label>
            <Input
              id="movement-ticket"
              placeholder="Ticket ID"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={createMovement.isPending}>
              {createMovement.isPending ? tc("saving") : tc("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
