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
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  ArrowDownUp,
  SlidersHorizontal,
  History,
  AlertTriangle,
  Boxes,
} from "lucide-react";
import { toast } from "sonner";
import { EditStockItemDialog } from "@/components/stock/edit-stock-item-dialog";
import { StockMovementDialog } from "@/components/stock/stock-movement-dialog";
import { StockAdjustDialog } from "@/components/stock/stock-adjust-dialog";
import { StockHistoryDrawer } from "@/components/stock/stock-history-drawer";

// -- Types --------------------------------------------------------------------

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

interface StockItemRow {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  category: StockCategory;
  quantity: number;
  minStock: number;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { movements: number; assets: number };
}

// -- Zod schema for create form -----------------------------------------------

const stockFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().optional(),
  unit: z.string().optional(),
  category: z
    .enum([
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
    ])
    .default("OTHER"),
  quantity: z.coerce.number().int().min(0).default(0),
  minStock: z.coerce.number().int().min(0).default(0),
  location: z.string().optional(),
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
  const [adjustItem, setAdjustItem] = useState<StockItemRow | null>(null);
  const [historyItem, setHistoryItem] = useState<StockItemRow | null>(null);

  const { data, isLoading } = useStockItems({
    search: search || undefined,
    category: category !== "all" ? category : undefined,
    lowStock: lowStock || undefined,
  });

  const deleteItem = useDeleteStockItem();
  const items = (data as StockItemRow[] | undefined) || [];

  // Summary
  const totalCount = items.length;
  const emptyCount = items.filter((i) => i.quantity === 0).length;
  const lowStockCount = items.filter((i) => i.quantity > 0 && i.quantity <= i.minStock).length;

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
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-4 px-4 pb-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-muted p-1.5">
                <Boxes className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("total")}</p>
                <p className="text-xl font-bold">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 px-4 pb-4">
            <div className="flex items-center gap-2">
              <div className={`rounded-lg p-1.5 ${lowStockCount > 0 ? "bg-orange-100 dark:bg-orange-900" : "bg-muted"}`}>
                <AlertTriangle className={`h-4 w-4 ${lowStockCount > 0 ? "text-orange-600 dark:text-orange-300" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bijna leeg</p>
                <p className="text-xl font-bold">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 px-4 pb-4">
            <div className="flex items-center gap-2">
              <div className={`rounded-lg p-1.5 ${emptyCount > 0 ? "bg-red-100 dark:bg-red-900" : "bg-muted"}`}>
                <AlertTriangle className={`h-4 w-4 ${emptyCount > 0 ? "text-red-600 dark:text-red-300" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Leeg</p>
                <p className="text-xl font-bold">{emptyCount}</p>
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
              <Boxes className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t("noItems")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {search || category !== "all" || lowStock
                  ? t("adjustFilters")
                  : t("addFirst")}
              </p>
            </div>
          ) : (
            <>
              {/* Mobiele kaartweergave */}
              <div className="md:hidden space-y-2">
                {items.map((item) => {
                  const isEmpty = item.quantity <= 0;
                  const isLow = !isEmpty && item.quantity <= item.minStock;
                  const borderColor = isEmpty ? "border-red-400 dark:border-red-700" : isLow ? "border-orange-400 dark:border-orange-700" : "";
                  const iconColor = isEmpty ? "text-red-500" : "text-orange-500";
                  return (
                    <div key={item.id} className={`rounded-lg border p-3 ${borderColor}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-sm">{item.name}</p>
                            {(isEmpty || isLow) && <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${iconColor}`} />}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">{t(item.category)}</Badge>
                            {item.location && <span className="text-xs text-muted-foreground">{item.location}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge className={
                            isEmpty
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                              : isLow
                              ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
                              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          }>
                            {item.quantity}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-0.5">min. {item.minStock}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 mt-2 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Bijboeken / corrigeren" onClick={() => setAdjustItem(item)}>
                          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title={t("addMovement")} onClick={() => setMovementItem(item)}>
                          <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Historie" onClick={() => setHistoryItem(item)}>
                          <History className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingItem(item)}>
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop tabelweergave */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Naam</TableHead>
                      <TableHead>Categorie</TableHead>
                      <TableHead className="text-right">Aantal</TableHead>
                      <TableHead className="text-right">Min. voorraad</TableHead>
                      <TableHead>Locatie</TableHead>
                      <TableHead className="w-[120px]">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const isEmpty = item.quantity === 0;
                      const isLow = !isEmpty && item.quantity <= item.minStock;
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item.name}</span>
                              {isEmpty && <AlertTriangle className="h-4 w-4 text-red-500" />}
                              {isLow && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                            </div>
                            {item.sku && <span className="text-xs text-muted-foreground">{item.sku}</span>}
                          </TableCell>
                          <TableCell><Badge variant="secondary">{t(item.category)}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Badge className={
                              isEmpty
                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                : isLow
                                ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
                                : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            }>{item.quantity}</Badge>
                            {item.unit && <span className="ml-1 text-xs text-muted-foreground">{item.unit}</span>}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{item.minStock}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.location || "—"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" title="Bijboeken / corrigeren" onClick={() => setAdjustItem(item)}><SlidersHorizontal className="h-4 w-4 text-muted-foreground" /></Button>
                              <Button variant="ghost" size="icon" title={t("addMovement")} onClick={() => setMovementItem(item)}><ArrowDownUp className="h-4 w-4 text-muted-foreground" /></Button>
                              <Button variant="ghost" size="icon" title="Historie" onClick={() => setHistoryItem(item)}><History className="h-4 w-4 text-muted-foreground" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setEditingItem(item)}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
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

      {/* Stock Movement Dialog (uitgifte/inname — getraceerde apparatuur) */}
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

      {/* Bijboeken / corrigeren */}
      {adjustItem && (
        <StockAdjustDialog
          open={!!adjustItem}
          onOpenChange={(open) => {
            if (!open) setAdjustItem(null);
          }}
          stockItemId={adjustItem.id}
          stockItemName={adjustItem.name}
          currentQuantity={adjustItem.quantity}
        />
      )}

      {/* Historie */}
      {historyItem && (
        <StockHistoryDrawer
          open={!!historyItem}
          onOpenChange={(open) => {
            if (!open) setHistoryItem(null);
          }}
          stockItemId={historyItem.id}
          stockItemName={historyItem.name}
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
      sku: "",
      unit: "stuk",
      category: "OTHER",
      quantity: 0,
      minStock: 0,
      location: "",
    },
  });

  async function onSubmit(data: StockFormData) {
    try {
      await createItem.mutateAsync({
        ...data,
        location: data.location || undefined,
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

          {/* SKU & Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock-sku">SKU</Label>
              <Input id="stock-sku" {...form.register("sku")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock-unit">Eenheid</Label>
              <Input id="stock-unit" placeholder="stuk" {...form.register("unit")} />
            </div>
          </div>

          {/* Category */}
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

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="stock-location">{t("location")}</Label>
            <Input id="stock-location" {...form.register("location")} />
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
