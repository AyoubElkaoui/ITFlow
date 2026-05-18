"use client";

import { useTranslations } from "next-intl";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTicketAssets, useLinkAsset } from "@/hooks/use-ticket-assets";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Laptop,
  Monitor,
  Printer,
  Phone,
  Wifi,
  Package,
  Search,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface AssetItem {
  id: string;
  type: string;
  name: string;
  assignedTo: string | null;
}

const assetTypeIcons: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  LAPTOP: Laptop,
  DESKTOP: Monitor,
  MONITOR: Monitor,
  PRINTER: Printer,
  PHONE: Phone,
  NETWORK: Wifi,
  OTHER: Package,
};

function AssetTypeIcon({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const Icon = assetTypeIcons[type] || Package;
  return <Icon className={className} />;
}

interface LinkAssetDialogProps {
  ticketId: string;
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LinkAssetDialog({
  ticketId,
  companyId,
  open,
  onOpenChange,
}: LinkAssetDialogProps) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");

  const { data: allAssets, isLoading: assetsLoading } = useQuery<AssetItem[]>({
    queryKey: ["assets", { companyId }],
    queryFn: async () => {
      const res = await fetch(`/api/assets?companyId=${companyId}`);
      if (!res.ok) throw new Error("Failed to fetch assets");
      return res.json();
    },
    enabled: open && !!companyId,
  });

  const { data: linkedAssets } = useTicketAssets(ticketId);
  const linkAsset = useLinkAsset(ticketId);

  const availableAssets = useMemo(() => {
    if (!allAssets) return [];
    const linkedIds = new Set(linkedAssets?.map((l) => l.assetId) ?? []);
    const filtered = allAssets.filter((a) => !linkedIds.has(a.id));

    if (!search.trim()) return filtered;

    const q = search.toLowerCase();
    return filtered.filter(
      (a) =>
        a.name?.toLowerCase().includes(q) ||
        a.assignedTo?.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q),
    );
  }, [allAssets, linkedAssets, search]);

  function handleReset() {
    setSearch("");
    setSelectedIds(new Set());
    setNote("");
  }

  function toggleAsset(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) handleReset();
    onOpenChange(nextOpen);
  }

  async function handleSubmit() {
    if (selectedIds.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedIds).map(assetId =>
          linkAsset.mutateAsync({ assetId, note: note.trim() || undefined })
        )
      );
      toast.success(`${selectedIds.size} asset${selectedIds.size > 1 ? "s" : ""} gekoppeld`);
      handleOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Koppelen mislukt");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("linkAsset")}</DialogTitle>
          <DialogDescription>
            Selecteer één of meerdere assets om te koppelen aan dit ticket.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder={t("searchAssets")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[240px] rounded-md border">
            {assetsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : availableAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground">
                <Package className="mb-2 size-6 text-muted-foreground/50" />
                {search.trim() ? t("noMatchingAssets") : t("noAvailableAssets")}
              </div>
            ) : (
              <div className="p-1">
                {availableAssets.map((asset) => {
                  const isSelected = selectedIds.has(asset.id);
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => toggleAsset(asset.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent",
                        isSelected && "bg-accent ring-1 ring-ring",
                      )}
                    >
                      {/* Checkbox indicator */}
                      <div className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                        isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                      )}>
                        {isSelected && <Check className="size-3 text-primary-foreground" />}
                      </div>

                      <div className="flex size-8 shrink-0 items-center justify-center rounded bg-muted">
                        <AssetTypeIcon type={asset.type} className="size-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{asset.name}</div>
                        {asset.assignedTo && (
                          <div className="text-xs text-muted-foreground truncate">{asset.assignedTo}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <div className="space-y-2">
            <Label htmlFor="link-asset-note">{t("noteOptional")}</Label>
            <Textarea
              id="link-asset-note"
              placeholder={t("noteDescription")}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="flex justify-between items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {selectedIds.size > 0
                ? `${selectedIds.size} geselecteerd`
                : "Klik om te selecteren"}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                {tc("cancel")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={selectedIds.size === 0 || linkAsset.isPending}
              >
                {linkAsset.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Koppelen...
                  </>
                ) : selectedIds.size > 1 ? (
                  `${selectedIds.size} assets koppelen`
                ) : (
                  t("linkAsset")
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
