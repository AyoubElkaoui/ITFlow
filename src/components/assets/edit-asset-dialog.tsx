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
import { Ticket } from "lucide-react";

const ASSET_TYPES = [
  "LAPTOP",
  "DESKTOP",
  "PRINTER",
  "MONITOR",
  "PHONE",
  "NETWORK",
  "OTHER",
] as const;

type AssetType = (typeof ASSET_TYPES)[number];

const assetFormSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  type: z
    .enum(["LAPTOP", "DESKTOP", "PRINTER", "MONITOR", "PHONE", "NETWORK", "OTHER"])
    .default("OTHER"),
  name: z.string().min(1, "Name is required"),
  assignedTo: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetFormSchema>;

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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: {
    id: string;
    companyId: string;
    type: string;
    name: string;
    assignedTo: string | null;
    company: { id: string; name: string; shortName: string };
  };
}

export function EditAssetDialog({ open, onOpenChange, asset }: Props) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");
  const updateAsset = useUpdateAsset(asset.id);

  const { data: assetDetail } = useAsset(asset.id);
  const detail = assetDetail as AssetDetail | undefined;
  const linkedTickets = detail?.ticketLinks || [];

  const form = useForm<AssetFormData>({
    resolver: typedResolver(assetFormSchema),
    defaultValues: {
      companyId: asset.companyId,
      type: (asset.type as AssetType) || "OTHER",
      name: asset.name || "",
      assignedTo: asset.assignedTo || "",
    },
  });

  useEffect(() => {
    form.reset({
      companyId: asset.companyId,
      type: (asset.type as AssetType) || "OTHER",
      name: asset.name || "",
      assignedTo: asset.assignedTo || "",
    });
  }, [asset, form]);

  async function onSubmit(data: AssetFormData) {
    try {
      await updateAsset.mutateAsync({
        ...data,
        assignedTo: data.assignedTo || undefined,
      });
      toast.success(t("assetUpdated"));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update asset");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-asset-name">{t("name")} *</Label>
            <Input id="edit-asset-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Type */}
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

          {/* Assigned To */}
          <div className="space-y-2">
            <Label htmlFor="edit-asset-assigned">{t("assignedTo")}</Label>
            <Input
              id="edit-asset-assigned"
              {...form.register("assignedTo")}
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
