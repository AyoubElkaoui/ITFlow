"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Package,
  Monitor,
  ChevronsUpDown,
  Unlink,
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
import {
  useTicketAssets,
  useLinkAsset,
  useUnlinkAsset,
} from "@/hooks/use-ticket-assets";
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
interface AssetLite {
  id: string;
  type: string;
  name: string;
  assignedTo: string | null;
}

function stockClass(qty: number, minStock: number): string {
  if (qty < 0) return "text-red-600";
  if (qty <= minStock) return "text-orange-600";
  return "text-muted-foreground";
}

interface Props {
  ticketId: string;
  companyId: string;
}

// Gecombineerde sectie: materiaal (voorraad, TICKET-movement) én apparatuur (asset-link)
// vanaf één searchable picker en in één lijst. Hergebruikt de bestaande API's/hooks.
export function TicketMaterialEquipment({ ticketId, companyId }: Props) {
  const { data: materials } = useTicketMaterials(ticketId);
  const { data: assetLinks } = useTicketAssets(ticketId);
  const { data: stockData } = useStockItems({});
  const { data: companyAssets } = useQuery<AssetLite[]>({
    queryKey: ["assets", { companyId }],
    queryFn: async () => {
      const res = await fetch(`/api/assets?companyId=${companyId}`);
      if (!res.ok) throw new Error("Failed to fetch assets");
      return res.json();
    },
    enabled: !!companyId,
  });

  const addMaterial = useAddMaterial(ticketId);
  const updateMaterial = useUpdateMaterial(ticketId);
  const deleteMaterial = useDeleteMaterial(ticketId);
  const linkAsset = useLinkAsset(ticketId);
  const unlinkAsset = useUnlinkAsset(ticketId);

  const stockItems = (stockData as StockItemLite[] | undefined) ?? [];
  const assets = companyAssets ?? [];
  const materialList = materials ?? [];
  const assetList = assetLinks ?? [];
  const linkedAssetIds = new Set(assetList.map((a) => a.assetId));

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<StockItemLite | null>(null);
  const [addQty, setAddQty] = useState("1");
  const [editId, setEditId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");

  async function handleAddMaterial() {
    const quantity = parseInt(addQty, 10);
    if (!selected || !quantity || quantity < 1) return;
    try {
      await addMaterial.mutateAsync({ stockItemId: selected.id, quantity });
      setSelected(null);
      setAddQty("1");
      toast.success("Materiaal toegevoegd");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mislukt");
    }
  }

  async function handleLinkAsset(assetId: string) {
    setPickerOpen(false);
    try {
      await linkAsset.mutateAsync({ assetId });
      toast.success("Apparaat gekoppeld");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mislukt");
    }
  }

  async function saveEdit(m: TicketMaterial) {
    const quantity = parseInt(editQty, 10);
    if (!quantity || quantity < 1) return;
    try {
      await updateMaterial.mutateAsync({ movementId: m.id, quantity });
      setEditId(null);
      toast.success("Bijgewerkt");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mislukt");
    }
  }

  return (
    <div className="space-y-4">
      {/* Eén picker over voorraad + apparatuur */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[220px] space-y-1">
          <label className="text-xs text-muted-foreground">
            Voorraad-item of apparaat
          </label>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between font-normal"
              >
                {selected ? selected.name : "Kies item of apparaat..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[--radix-popover-trigger-width] p-0"
              align="start"
            >
              <Command>
                <CommandInput placeholder="Zoek voorraad of apparaat..." />
                <CommandList>
                  <CommandEmpty>Niets gevonden.</CommandEmpty>
                  <CommandGroup heading="Voorraad">
                    {stockItems.map((item) => (
                      <CommandItem
                        key={`stock-${item.id}`}
                        value={`voorraad ${item.name}`}
                        onSelect={() => {
                          setSelected(item);
                          setPickerOpen(false);
                        }}
                      >
                        <Package className="mr-2 h-4 w-4 text-muted-foreground" />
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
                  <CommandGroup heading="Apparatuur (deze klant)">
                    {assets.map((a) => (
                      <CommandItem
                        key={`asset-${a.id}`}
                        value={`apparaat ${a.name} ${a.assignedTo ?? ""}`}
                        disabled={linkedAssetIds.has(a.id)}
                        onSelect={() => handleLinkAsset(a.id)}
                      >
                        <Monitor className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">{a.name}</span>
                        {a.assignedTo && (
                          <span className="text-xs text-muted-foreground">
                            {a.assignedTo}
                          </span>
                        )}
                        {linkedAssetIds.has(a.id) && (
                          <Check className="ml-2 h-3.5 w-3.5 text-emerald-600" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Aantal + toevoegen — alleen voor voorraad-item */}
        {selected && (
          <>
            <div className="w-24 space-y-1">
              <label className="text-xs text-muted-foreground">Aantal</label>
              <Input
                type="number"
                min={1}
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
              />
            </div>
            <Button onClick={handleAddMaterial} disabled={addMaterial.isPending}>
              <Plus className="mr-1.5 h-4 w-4" />
              Toevoegen
            </Button>
          </>
        )}
      </div>

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

      {/* Eén lijst: materiaal + apparatuur */}
      {materialList.length === 0 && assetList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
          <Package className="mb-2 h-8 w-8 opacity-40" />
          <p className="text-sm">Nog geen materiaal of apparatuur gekoppeld.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Voorraad-regels (TICKET-movements) */}
          {materialList.map((m) => {
            const editing = editId === m.id;
            const belowZero = m.stockItem.quantity < 0;
            const belowMin =
              !belowZero && m.stockItem.quantity <= m.stockItem.minStock;
            return (
              <div
                key={`m-${m.id}`}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <Badge variant="secondary" className="gap-1 shrink-0">
                  <Package className="h-3 w-3" />
                  Voorraad
                </Badge>
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
                    <Badge variant="outline" className="tabular-nums">
                      {m.quantity}
                      {m.stockItem.unit ? ` ${m.stockItem.unit}` : ""}
                    </Badge>
                    {(belowZero || belowMin) && (
                      <span
                        title={belowZero ? "Voorraad negatief" : "Onder besteldrempel"}
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
                        onClick={() => deleteMaterial.mutate(m.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Apparatuur-regels (asset-links) */}
          {assetList.map((a) => (
            <div
              key={`a-${a.id}`}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <Badge className="gap-1 shrink-0 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">
                <Monitor className="h-3 w-3" />
                Apparaat
              </Badge>
              <span className="min-w-0 flex-1 truncate font-medium">
                {a.asset.name}
              </span>
              {a.asset.assignedTo && (
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {a.asset.assignedTo}
                </span>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                title="Ontkoppelen"
                onClick={() => unlinkAsset.mutate(a.id)}
              >
                <Unlink className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
