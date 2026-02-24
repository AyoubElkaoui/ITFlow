"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { typedResolver } from "@/lib/form-utils";
import {
  useStockItems,
  useCreateStockItem,
  useDeleteStockItem,
} from "@/hooks/use-stock";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Package,
  Trash2,
  Pencil,
  ArrowDownUp,
  AlertTriangle,
  Boxes,
} from "lucide-react";
import { toast } from "sonner";
import { EditStockItemDialog } from "@/components/stock/edit-stock-item-dialog";
import { StockMovementDialog } from "@/components/stock/stock-movement-dialog";

// -- Types --------------------------------------------------------------------

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

interface StockItemRow {
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
  isActive: boolean;
  createdAt: string;
  _count?: { movements: number };
}

// -- Zod schema for create form -----------------------------------------------

const stockFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z
    .enum([
      "CABLE",
      "ADAPTER",
      "TONER",
      "PERIPHERAL",
      "COMPONENT",
      "TOOL",
      "OTHER",
    ])
    .default("OTHER"),
  description: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.coerce.number().int().min(0).default(0),
  minStock: z.coerce.number().int().min(0).default(0),
  location: z.string().optional(),
  unitPrice: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

type StockFormData = z.infer<typeof stockFormSchema>;

// -- Page component -----------------------------------------------------------

export default function StockPage() {
  const t = useTranslations("stock");
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [lowStock, setLowStock] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItemRow | null>(null);
  const [movementItem, setMovementItem] = useState<StockItemRow | null>(null);

  const { data, isLoading } = useStockItems({
    search: search || undefined,
    category: category !== "all" ? category : undefined,
    lowStock: lowStock || undefined,
  });

  const deleteItem = useDeleteStockItem();
  const items = (data as StockItemRow[] | undefined) || [];

  // Summary
  const totalCount = items.length;
  const lowStockCount = items.filter((i) => i.quantity <= i.minStock).length;
  const totalValue = items.reduce((sum, i) => {
    const price = typeof i.unitPrice === "string" ? parseFloat(i.unitPrice) : (i.unitPrice || 0);
    return sum + price * i.quantity;
  }, 0);

  function handleDelete(id: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    deleteItem.mutate(id, {
      onSuccess: () => toast.success(t("itemArchived")),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Failed"),
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addItem")}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <Boxes className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("total")}</p>
                <p className="text-2xl font-bold">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div
                className={`rounded-lg p-2 ${lowStockCount > 0 ? "bg-red-100 dark:bg-red-900" : "bg-green-100 dark:bg-green-900"}`}
              >
                <AlertTriangle
                  className={`h-5 w-5 ${lowStockCount > 0 ? "text-red-600 dark:text-red-300" : "text-green-600 dark:text-green-300"}`}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("lowStock")}
                </p>
                <p className="text-2xl font-bold">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 dark:bg-blue-900 p-2">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("totalValue")}
                </p>
                <p className="text-2xl font-bold">
                  &euro;{totalValue.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("allCategories")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allCategories")}</SelectItem>
                {STOCK_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {t(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={lowStock ? "default" : "outline"}
              size="sm"
              onClick={() => setLowStock(!lowStock)}
            >
              <AlertTriangle className="mr-1 h-4 w-4" />
              {t("showLowStock")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t("noItems")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {search || category !== "all" || lowStock
                  ? t("adjustFilters")
                  : t("addFirst")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("name")}</TableHead>
                    <TableHead>{t("category")}</TableHead>
                    <TableHead>{t("sku")}</TableHead>
                    <TableHead className="text-right">{t("quantity")}</TableHead>
                    <TableHead className="text-right">
                      {t("minStock")}
                    </TableHead>
                    <TableHead>{t("location")}</TableHead>
                    <TableHead className="text-right">
                      {t("unitPrice")}
                    </TableHead>
                    <TableHead className="w-[120px]">{tc("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const isLow = item.quantity <= item.minStock;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.name}</span>
                            {isLow && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {item.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{t(item.category)}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {item.sku || "\u2014"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={isLow ? "destructive" : "outline"}
                            className={
                              !isLow
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                : ""
                            }
                          >
                            {item.quantity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {item.minStock}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.location || "\u2014"}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {item.unitPrice
                            ? `\u20AC${typeof item.unitPrice === "string" ? parseFloat(item.unitPrice).toFixed(2) : Number(item.unitPrice).toFixed(2)}`
                            : "\u2014"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t("addMovement")}
                              onClick={() => setMovementItem(item)}
                            >
                              <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingItem(item)}
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Stock Item Dialog */}
      <CreateStockItemDialog
        open={showCreate}
        onOpenChange={setShowCreate}
      />

      {/* Edit Stock Item Dialog */}
      {editingItem && (
        <EditStockItemDialog
          open={!!editingItem}
          onOpenChange={(open) => {
            if (!open) setEditingItem(null);
          }}
          item={editingItem}
        />
      )}

      {/* Stock Movement Dialog */}
      {movementItem && (
        <StockMovementDialog
          open={!!movementItem}
          onOpenChange={(open) => {
            if (!open) setMovementItem(null);
          }}
          stockItemId={movementItem.id}
          stockItemName={movementItem.name}
          currentQuantity={movementItem.quantity}
        />
      )}
    </div>
  );
}

// -- Create Stock Item Dialog -------------------------------------------------

function CreateStockItemDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createItem = useCreateStockItem();
  const t = useTranslations("stock");
  const tc = useTranslations("common");

  const form = useForm<StockFormData>({
    resolver: typedResolver(stockFormSchema),
    defaultValues: {
      name: "",
      category: "OTHER",
      description: "",
      sku: "",
      quantity: 0,
      minStock: 0,
      location: "",
      notes: "",
    },
  });

  async function onSubmit(data: StockFormData) {
    try {
      await createItem.mutateAsync({
        ...data,
        description: data.description || undefined,
        sku: data.sku || undefined,
        location: data.location || undefined,
        unitPrice: data.unitPrice || undefined,
        notes: data.notes || undefined,
      });
      toast.success(t("itemCreated"));
      form.reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("addItem")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="stock-name">{t("name")} *</Label>
            <Input id="stock-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Category & SKU */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("category")}</Label>
              <Select
                value={form.watch("category")}
                onValueChange={(v) =>
                  form.setValue("category", v as StockCategory)
                }
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
              <Label htmlFor="stock-sku">{t("sku")}</Label>
              <Input id="stock-sku" {...form.register("sku")} />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="stock-description">{t("description")}</Label>
            <Textarea
              id="stock-description"
              rows={2}
              {...form.register("description")}
            />
          </div>

          {/* Quantity & Min Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock-quantity">{t("quantity")}</Label>
              <Input
                id="stock-quantity"
                type="number"
                min={0}
                {...form.register("quantity")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock-min">{t("minStock")}</Label>
              <Input
                id="stock-min"
                type="number"
                min={0}
                {...form.register("minStock")}
              />
            </div>
          </div>

          {/* Location & Unit Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock-location">{t("location")}</Label>
              <Input id="stock-location" {...form.register("location")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock-price">{t("unitPrice")}</Label>
              <Input
                id="stock-price"
                type="number"
                min={0}
                step="0.01"
                {...form.register("unitPrice")}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="stock-notes">{tc("notes")}</Label>
            <Textarea
              id="stock-notes"
              rows={2}
              {...form.register("notes")}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={createItem.isPending}>
              {createItem.isPending ? t("creating") : t("createItem")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
