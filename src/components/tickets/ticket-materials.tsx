"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Package,
  ChevronsUpDown,
  AlertTriangle,
} from "lucide-react";

import { useStockItems } from "@/hooks/use-stock";
import {
  useTicketMaterials,
  useAddMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
  type TicketMaterial,
} from "@/hooks/use-ticket-materials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface StockItemLite {
  id: string;
  name: string;
  unit: string | null;
  quantity: number;
  minStock: number;
}

// Voorraad-status na verbruik: rood < 0, oranje <= minStock.
function stockClass(qty: number, minStock: number): string {
  if (qty < 0) return "text-red-600";
  if (qty <= minStock) return "text-orange-600";
  return "text-muted-foreground";
}

interface Props {
  ticketId: string;
}

export function TicketMaterials({ ticketId }: Props) {
  const { data: materials } = useTicketMaterials(ticketId);
  const { data: stockData } = useStockItems({});
  const add = useAddMaterial(ticketId);
  const update = useUpdateMaterial(ticketId);
  const del = useDeleteMaterial(ticketId);

  const stockItems = (stockData as StockItemLite[] | undefined) ?? [];
  const list = materials ?? [];

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [addQty, setAddQty] = useState("1");

  const [editId, setEditId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");

  const selected = stockItems.find((s) => s.id === selectedId);

  async function handleAdd() {
    const quantity = parseInt(addQty, 10);
    if (!selectedId || !quantity || quantity < 1) return;
    try {
      await add.mutateAsync({ stockItemId: selectedId, quantity });
      setSelectedId("");
      setAddQty("1");
      toast.success("Materiaal toegevoegd");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mislukt");
    }
  }

  async function saveEdit(m: TicketMaterial) {
    const quantity = parseInt(editQty, 10);
    if (!quantity || quantity < 1) return;
    try {
      await update.mutateAsync({ movementId: m.id, quantity });
      setEditId(null);
      toast.success("Bijgewerkt");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mislukt");
    }
  }

  return (
    <div className="space-y-4">
      {/* Regel toevoegen */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px] space-y-1">
          <label className="text-xs text-muted-foreground">Voorraaditem</label>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between font-normal"
              >
                {selected ? selected.name : "Kies item..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Zoek item..." />
                <CommandList>
                  <CommandEmpty>Geen item gevonden.</CommandEmpty>
                  <CommandGroup>
                    {stockItems.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={item.name}
                        onSelect={() => {
                          setSelectedId(item.id);
                          setPickerOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedId === item.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="flex-1">{item.name}</span>
                        <span
                          className={cn(
                            "text-xs tabular-nums",
                            stockClass(item.quantity, item.minStock),
                          )}
                        >
                          {item.quantity}
                          {item.unit ? ` ${item.unit}` : ""}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="w-24 space-y-1">
          <label className="text-xs text-muted-foreground">Aantal</label>
          <Input
            type="number"
            min={1}
            value={addQty}
            onChange={(e) => setAddQty(e.target.value)}
          />
        </div>
        <Button onClick={handleAdd} disabled={!selectedId || add.isPending}>
          <Plus className="mr-1.5 h-4 w-4" />
          Toevoegen
        </Button>
      </div>

      {/* Hint over de voorraadstand van het gekozen item */}
      {selected && (
        <p className="text-xs text-muted-foreground">
          Na afboeken:{" "}
          <span
            className={stockClass(
              selected.quantity - (parseInt(addQty, 10) || 0),
              selected.minStock,
            )}
          >
            {selected.quantity - (parseInt(addQty, 10) || 0)}
            {selected.unit ? ` ${selected.unit}` : ""}
          </span>
        </p>
      )}

      {/* Materiaalregels */}
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
          <Package className="mb-2 h-8 w-8 opacity-40" />
          <p className="text-sm">Nog geen materiaal geregistreerd.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {list.map((m) => {
            const editing = editId === m.id;
            const belowZero = m.stockItem.quantity < 0;
            const belowMin =
              !belowZero && m.stockItem.quantity <= m.stockItem.minStock;
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {m.stockItem.name}
                </span>

                {editing ? (
                  <>
                    <Input
                      type="number"
                      min={1}
                      value={editQty}
                      onChange={(e) => setEditQty(e.target.value)}
                      className="h-8 w-20"
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit(m)}>
                      <Check className="h-4 w-4 text-emerald-600" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditId(null)}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge variant="secondary" className="tabular-nums">
                      {m.quantity}
                      {m.stockItem.unit ? ` ${m.stockItem.unit}` : ""}
                    </Badge>
                    {(belowZero || belowMin) && (
                      <span
                        title={
                          belowZero
                            ? "Voorraad negatief"
                            : "Voorraad onder besteldrempel"
                        }
                        className={belowZero ? "text-red-600" : "text-orange-600"}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </span>
                    )}
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      voorraad:{" "}
                      <span className={stockClass(m.stockItem.quantity, m.stockItem.minStock)}>
                        {m.stockItem.quantity}
                      </span>
                    </span>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditId(m.id);
                          setEditQty(String(m.quantity));
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => del.mutate(m.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
