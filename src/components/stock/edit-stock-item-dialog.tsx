"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { useUpdateStockItem } from "@/hooks/use-stock";
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
import { toast } from "sonner";

const STOCK_CATEGORIES = [
  "CABLE",
  "ADAPTER",
  "TONER",
  "PERIPHERAL",
  "COMPONENT",
  "TOOL",
  "OTHER",
] as const;

type StockCategory = (typeof STOCK_CATEGORIES)[number];

interface StockItemData {
  id: string;
  name: string;
  category: StockCategory;
  description: string | null;
  sku: string | null;
  quantity: number;
  minStock: number;
  location: string | null;
  unitPrice: string | number | null;
  notes: string | null;
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
  const [category, setCategory] = useState<StockCategory>(item.category);
  const [description, setDescription] = useState(item.description || "");
  const [sku, setSku] = useState(item.sku || "");
  const [minStock, setMinStock] = useState(String(item.minStock));
  const [location, setLocation] = useState(item.location || "");
  const [unitPrice, setUnitPrice] = useState(
    item.unitPrice ? String(item.unitPrice) : "",
  );
  const [notes, setNotes] = useState(item.notes || "");

  useEffect(() => {
    setName(item.name);
    setCategory(item.category);
    setDescription(item.description || "");
    setSku(item.sku || "");
    setMinStock(String(item.minStock));
    setLocation(item.location || "");
    setUnitPrice(item.unitPrice ? String(item.unitPrice) : "");
    setNotes(item.notes || "");
  }, [item]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateItem.mutateAsync({
        name,
        category,
        description: description || undefined,
        sku: sku || undefined,
        minStock: parseInt(minStock) || 0,
        location: location || undefined,
        unitPrice: unitPrice ? parseFloat(unitPrice) : undefined,
        notes: notes || undefined,
      });
      toast.success(t("itemUpdated"));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="edit-sku">{t("sku")}</Label>
              <Input
                id="edit-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">{t("description")}</Label>
            <Textarea
              id="edit-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
              <Label htmlFor="edit-unit-price">{t("unitPrice")}</Label>
              <Input
                id="edit-unit-price"
                type="number"
                min={0}
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-location">{t("location")}</Label>
            <Input
              id="edit-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">{tc("notes")}</Label>
            <Textarea
              id="edit-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

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
