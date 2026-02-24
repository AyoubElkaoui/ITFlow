"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { typedResolver } from "@/lib/form-utils";
import { useUpdateAsset, useAsset } from "@/hooks/use-assets";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompanySelect } from "@/components/shared/company-select";
import { toast } from "sonner";
import { format } from "date-fns";
import { Ticket } from "lucide-react";

// -- Constants ----------------------------------------------------------------

const ASSET_TYPES = [
  "LAPTOP",
  "DESKTOP",
  "PRINTER",
  "MONITOR",
  "PHONE",
  "NETWORK",
  "OTHER",
] as const;

const ASSET_STATUSES = ["ACTIVE", "IN_REPAIR", "STORED", "RETIRED"] as const;

type AssetType = (typeof ASSET_TYPES)[number];
type AssetStatus = (typeof ASSET_STATUSES)[number];

// -- Zod schema ---------------------------------------------------------------

const assetFormSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  type: z
    .enum([
      "LAPTOP",
      "DESKTOP",
      "PRINTER",
      "MONITOR",
      "PHONE",
      "NETWORK",
      "OTHER",
    ])
    .default("OTHER"),
  brand: z.string().optional(),
  model: z.string().optional(),
  name: z.string().optional(),
  assetTag: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
  warrantyEnd: z.string().optional(),
  assignedTo: z.string().optional(),
  status: z
    .enum(["ACTIVE", "IN_REPAIR", "STORED", "RETIRED"])
    .default("ACTIVE"),
  notes: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetFormSchema>;

// -- Helpers ------------------------------------------------------------------

function formatDateValue(date: string | null): string {
  if (!date) return "";
  try {
    return format(new Date(date), "yyyy-MM-dd");
  } catch {
    return "";
  }
}

// -- Types for linked tickets -------------------------------------------------

interface LinkedTicket {
  ticket: {
    id: string;
    ticketNumber: number;
    subject: string;
    status: string;
    createdAt: string;
  };
}

interface AssetDetail {
  ticketLinks?: LinkedTicket[];
}

// -- Props --------------------------------------------------------------------

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: {
    id: string;
    companyId: string;
    type: string;
    brand: string | null;
    model: string | null;
    name: string | null;
    assetTag?: string | null;
    serialNumber: string | null;
    purchaseDate: string | null;
    warrantyEnd: string | null;
    assignedTo: string | null;
    status: string;
    notes: string | null;
    company: { id: string; name: string; shortName: string };
  };
}

// -- Component ----------------------------------------------------------------

export function EditAssetDialog({ open, onOpenChange, asset }: Props) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");
  const updateAsset = useUpdateAsset(asset.id);

  // Fetch full asset detail including linked tickets
  const { data: assetDetail } = useAsset(asset.id);
  const detail = assetDetail as AssetDetail | undefined;
  const linkedTickets = detail?.ticketLinks || [];

  const form = useForm<AssetFormData>({
    resolver: typedResolver(assetFormSchema),
    defaultValues: {
      companyId: asset.companyId,
      type: (asset.type as AssetType) || "OTHER",
      brand: asset.brand || "",
      model: asset.model || "",
      name: asset.name || "",
      assetTag: asset.assetTag || "",
      serialNumber: asset.serialNumber || "",
      purchaseDate: formatDateValue(asset.purchaseDate),
      warrantyEnd: formatDateValue(asset.warrantyEnd),
      assignedTo: asset.assignedTo || "",
      status: (asset.status as AssetStatus) || "ACTIVE",
      notes: asset.notes || "",
    },
  });

  // Reset form when the asset prop changes
  useEffect(() => {
    form.reset({
      companyId: asset.companyId,
      type: (asset.type as AssetType) || "OTHER",
      brand: asset.brand || "",
      model: asset.model || "",
      name: asset.name || "",
      assetTag: asset.assetTag || "",
      serialNumber: asset.serialNumber || "",
      purchaseDate: formatDateValue(asset.purchaseDate),
      warrantyEnd: formatDateValue(asset.warrantyEnd),
      assignedTo: asset.assignedTo || "",
      status: (asset.status as AssetStatus) || "ACTIVE",
      notes: asset.notes || "",
    });
  }, [asset, form]);

  async function onSubmit(data: AssetFormData) {
    try {
      const payload = {
        ...data,
        assetTag: data.assetTag || undefined,
        purchaseDate: data.purchaseDate || undefined,
        warrantyEnd: data.warrantyEnd || undefined,
      };
      await updateAsset.mutateAsync(payload);
      toast.success("Asset updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update asset",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editAsset")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Company */}
          <div className="space-y-2">
            <Label>{tc("company")} *</Label>
            <CompanySelect
              value={form.watch("companyId")}
              onValueChange={(v) => form.setValue("companyId", v)}
            />
            {form.formState.errors.companyId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.companyId.message}
              </p>
            )}
          </div>

          {/* Asset Tag */}
          <div className="space-y-2">
            <Label htmlFor="edit-asset-tag">{t("assetTag")}</Label>
            <Input
              id="edit-asset-tag"
              placeholder="bijv. MAZLAP022601"
              {...form.register("assetTag")}
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-asset-name">{tc("name")}</Label>
            <Input id="edit-asset-name" {...form.register("name")} />
          </div>

          {/* Type & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{tc("type")}</Label>
              <Select
                value={form.watch("type")}
                onValueChange={(v) => form.setValue("type", v as AssetType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((assetType) => (
                    <SelectItem key={assetType} value={assetType}>
                      {t(assetType)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tc("status")}</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) =>
                  form.setValue("status", v as AssetStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Brand & Model */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-asset-brand">{tc("brand")}</Label>
              <Input id="edit-asset-brand" {...form.register("brand")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-asset-model">{tc("model")}</Label>
              <Input id="edit-asset-model" {...form.register("model")} />
            </div>
          </div>

          {/* Serial Number & Assigned To */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-asset-serial">{t("serialNumber")}</Label>
              <Input
                id="edit-asset-serial"
                {...form.register("serialNumber")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-asset-assigned">{t("assignedTo")}</Label>
              <Input
                id="edit-asset-assigned"
                {...form.register("assignedTo")}
              />
            </div>
          </div>

          {/* Purchase Date & Warranty End */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-asset-purchase">{t("purchaseDate")}</Label>
              <Input
                id="edit-asset-purchase"
                type="date"
                {...form.register("purchaseDate")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-asset-warranty">{t("warrantyEnd")}</Label>
              <Input
                id="edit-asset-warranty"
                type="date"
                {...form.register("warrantyEnd")}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="edit-asset-notes">{tc("notes")}</Label>
            <Textarea
              id="edit-asset-notes"
              rows={3}
              {...form.register("notes")}
            />
          </div>

          {/* Linked Tickets */}
          {linkedTickets.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Ticket className="h-4 w-4" />
                {t("linkedTickets")}
              </Label>
              <div className="rounded-md border divide-y">
                {linkedTickets.map((link) => (
                  <div
                    key={link.ticket.id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-mono text-muted-foreground">
                        #{link.ticket.ticketNumber}
                      </span>{" "}
                      <span>{link.ticket.subject}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {link.ticket.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {linkedTickets.length === 0 && detail && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Ticket className="h-4 w-4" />
                {t("linkedTickets")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("noLinkedTickets")}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={updateAsset.isPending}>
              {updateAsset.isPending ? tc("saving") : tc("saveChanges")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
