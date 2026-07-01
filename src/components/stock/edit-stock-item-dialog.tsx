"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useUpdateStockItem } from "@/hooks/use-stock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { toast } from "sonner";

const STOCK_CATEGORIES = [
  "CABLE",
  "ADAPTER",
  "TONER",
  "PERIPHERAL",
  "COMPONENT",
  "TOOL",
  "LAPTOP",
  "DESKTOP",
  "PRINTER",
  "MONITOR",
  "PHONE",
  "NETWORK_EQUIPMENT",
  "OTHER",
] as const;

type StockCategory = (typeof STOCK_CATEGORIES)[number];

interface StockItemData {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  category: StockCategory;
  quantity: number;
  minStock: number;
  location: string | null;
  isActive: boolean;
}

interface EditStockItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: StockItemData;
}

export function EditStockItemDialog({
  open,
  onOpenChange,
  item,
}: EditStockItemDialogProps) {
  const t = useTranslations("stock");
  const tc = useTranslations("common");
  const updateItem = useUpdateStockItem(item.id);

  const [name, setName] = useState(item.name);
  const [sku, setSku] = useState(item.sku || "");
  const [unit, setUnit] = useState(item.unit || "");
  const [category, setCategory] = useState<StockCategory>(item.category);
  const [minStock, setMinStock] = useState(String(item.minStock));
  const [location, setLocation] = useState(item.location || "");
  const [isActive, setIsActive] = useState(item.isActive);

  // Reset velden wanneer een ander item wordt bewerkt (zonder effect).
  const [seededId, setSeededId] = useState(item.id);
  if (item.id !== seededId) {
    setSeededId(item.id);
    setName(item.name);
    setSku(item.sku || "");
    setUnit(item.unit || "");
    setCategory(item.category);
    setMinStock(String(item.minStock));
    setLocation(item.location || "");
    setIsActive(item.isActive);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      // Bewust GEEN quantity hier: currentQty muteert alleen via movements
      // (Bijboeken / Corrigeren). Dit voorkomt losse cache-mutatie.
      await updateItem.mutateAsync({
        name,
        sku: sku || undefined,
        unit: unit || undefined,
        category,
        minStock: parseInt(minStock) || 0,
        location: location || undefined,
        isActive,
      });
      toast.success(t("itemUpdated"));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editItem")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">{t("name")} *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{t("category")}</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as StockCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STOCK_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {t(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-sku">SKU</Label>
              <Input
                id="edit-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-unit">Eenheid</Label>
              <Input
                id="edit-unit"
                placeholder="stuk"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-min-stock">{t("minStock")}</Label>
              <Input
                id="edit-min-stock"
                type="number"
                min={0}
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">{t("location")}</Label>
              <Input
                id="edit-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch id="edit-active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="edit-active" className="cursor-pointer">
              Actief
            </Label>
          </div>

          <p className="text-xs text-muted-foreground">
            Aantal wijzig je via Bijboeken / Corrigeren op de voorraadlijst.
          </p>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={updateItem.isPending}>
              {updateItem.isPending ? tc("saving") : tc("saveChanges")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
