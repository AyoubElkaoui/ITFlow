"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  useTicketAssets,
  useUnlinkAsset,
  type AssetLink,
} from "@/hooks/use-ticket-assets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Laptop,
  Monitor,
  Printer,
  Phone,
  Wifi,
  Package,
  Link2,
  Unlink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { LinkAssetDialog } from "./link-asset-dialog";

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

const assetStatusStyles: Record<string, string> = {
  ACTIVE: "bg-green-500/15 text-green-400 border-green-500/30",
  IN_REPAIR: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  STORED: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  RETIRED: "bg-muted text-muted-foreground border-border",
};

function assetDisplayName(
  asset: AssetLink["asset"],
  t: (key: string) => string,
): string {
  if (asset.name) return asset.name;
  const parts = [asset.brand, asset.model].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : t("unnamed");
}

function assetSubtitle(asset: AssetLink["asset"]): string | null {
  if (!asset.name) return null;
  const parts = [asset.brand, asset.model].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

interface TicketAssetsProps {
  ticketId: string;
  companyId: string;
}

export function TicketAssets({ ticketId, companyId }: TicketAssetsProps) {
  const t = useTranslations("assets");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const { data: assetLinks, isLoading } = useTicketAssets(ticketId);
  const unlinkAsset = useUnlinkAsset(ticketId);

  async function handleUnlink(linkId: string) {
    try {
      await unlinkAsset.mutateAsync(linkId);
      toast.success(t("assetUnlinked") as string);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to unlink asset",
      );
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t("linkedAssets")}</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLinkDialogOpen(true)}
        >
          <Link2 className="mr-1.5 size-3.5" />
          {t("linkAsset")}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : !assetLinks || assetLinks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <Package className="mx-auto mb-2 size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{t("noLinkedAssets")}</p>
          <Button
            variant="link"
            size="sm"
            className="mt-1"
            onClick={() => setLinkDialogOpen(true)}
          >
            {t("linkAnAsset")}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {assetLinks.map((link) => (
            <div
              key={link.id}
              className="flex items-center gap-3 rounded-lg border bg-card p-3"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <AssetTypeIcon
                  type={link.asset.type}
                  className="size-4 text-muted-foreground"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {assetDisplayName(link.asset, t as (key: string) => string)}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-medium",
                      assetStatusStyles[link.asset.status] || "",
                    )}
                  >
                    {t(link.asset.status as any)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {assetSubtitle(link.asset) && (
                    <span className="truncate">
                      {assetSubtitle(link.asset)}
                    </span>
                  )}
                  {link.asset.serialNumber && (
                    <>
                      {assetSubtitle(link.asset) && (
                        <span className="text-border">|</span>
                      )}
                      <span className="truncate font-mono">
                        {link.asset.serialNumber}
                      </span>
                    </>
                  )}
                </div>
                {link.note && (
                  <p className="mt-1 text-xs text-muted-foreground/80 italic">
                    {link.note}
                  </p>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleUnlink(link.id)}
                disabled={unlinkAsset.isPending}
              >
                <Unlink className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <LinkAssetDialog
        ticketId={ticketId}
        companyId={companyId}
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
      />
    </div>
  );
}
