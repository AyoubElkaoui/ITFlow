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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanySelect } from "@/components/shared/company-select";
import { toast } from "sonner";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";

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

  const [tab, setTab] = useState<"OUT" | "IN">("OUT");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  // OUT fields
  const [companyId, setCompanyId] = useState("");
  const [assetName, setAssetName] = useState(stockItemName);
  const [assignedTo, setAssignedTo] = useState("");

  function resetForm() {
    setTab("OUT");
    setQuantity("1");
    setNote("");
    setCompanyId("");
    setAssetName(stockItemName);
    setAssignedTo("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseInt(quantity);
    if (!qty || qty < 1) return;

    try {
      if (tab === "OUT") {
        if (!companyId) {
          toast.error(t("companyRequired"));
          return;
        }
        await createMovement.mutateAsync({
          type: "OUT",
          quantity: qty,
          note: note || undefined,
          companyId,
          assetName: assetName || stockItemName,
          assignedTo: assignedTo || undefined,
        });
        toast.success(t("uitgifteSuccess"));
      } else {
        await createMovement.mutateAsync({
          type: "IN",
          quantity: qty,
          note: note || undefined,
        });
        toast.success(t("innameSuccess"));
      }
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
          <DialogTitle>{stockItemName}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t("currentStock")}: <span className="font-medium">{currentQuantity}</span>
        </p>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "OUT" | "IN")}>
          <TabsList className="w-full">
            <TabsTrigger value="OUT" className="flex-1 gap-1.5">
              <ArrowUpRight className="h-3.5 w-3.5" />
              {t("uitgifte")}
            </TabsTrigger>
            <TabsTrigger value="IN" className="flex-1 gap-1.5">
              <ArrowDownLeft className="h-3.5 w-3.5" />
              {t("inname")}
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Quantity — always shown */}
            <div className="space-y-2">
              <Label htmlFor="movement-qty">{t("quantity")} *</Label>
              <Input
                id="movement-qty"
                type="number"
                min={1}
                max={tab === "OUT" ? currentQuantity : undefined}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            <TabsContent value="OUT" className="mt-0 space-y-4">
              {/* Company — required for OUT */}
              <div className="space-y-2">
                <Label>{tc("company")} *</Label>
                <CompanySelect
                  value={companyId || undefined}
                  onValueChange={(v) => setCompanyId(v === "all" ? "" : v)}
                  placeholder={tc("selectCompany")}
                />
              </div>

              {/* Asset name — pre-filled */}
              <div className="space-y-2">
                <Label htmlFor="asset-name">{t("name")}</Label>
                <Input
                  id="asset-name"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                />
              </div>

              {/* Assigned to */}
              <div className="space-y-2">
                <Label htmlFor="assigned-to">{t("assignedTo")}</Label>
                <Input
                  id="assigned-to"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder={t("assignedToPlaceholder")}
                />
              </div>
            </TabsContent>

            <TabsContent value="IN" className="mt-0 space-y-4">
              {/* Nothing extra needed for IN — just quantity */}
            </TabsContent>

            {/* Note — always shown */}
            <div className="space-y-2">
              <Label htmlFor="movement-note">{t("movementNote")}</Label>
              <Textarea
                id="movement-note"
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
                  resetForm();
                  onOpenChange(false);
                }}
              >
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={createMovement.isPending}>
                {createMovement.isPending
                  ? tc("saving")
                  : tab === "OUT"
                    ? t("uitgifte")
                    : t("inname")}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
