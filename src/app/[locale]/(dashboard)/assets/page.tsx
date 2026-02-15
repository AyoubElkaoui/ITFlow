"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { typedResolver } from "@/lib/form-utils";
import { useAssets, useCreateAsset, useDeleteAsset } from "@/hooks/use-assets";
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
import { CompanySelect } from "@/components/shared/company-select";
import { Plus, Search, Monitor, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { EditAssetDialog } from "@/components/assets/edit-asset-dialog";

// ── Types ──────────────────────────────────────────────────────────────────────

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

interface AssetRow {
  id: string;
  companyId: string;
  type: AssetType;
  brand: string | null;
  model: string | null;
  name: string | null;
  serialNumber: string | null;
  purchaseDate: string | null;
  warrantyEnd: string | null;
  assignedTo: string | null;
  status: AssetStatus;
  notes: string | null;
  createdAt: string;
  company: { id: string; name: string; shortName: string };
}

// ── Zod schema for create form ─────────────────────────────────────────────────

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

// ── Badge helpers ──────────────────────────────────────────────────────────────

function typeBadgeVariant(
  type: AssetType,
): "default" | "secondary" | "outline" {
  switch (type) {
    case "LAPTOP":
    case "DESKTOP":
      return "default";
    case "PRINTER":
      return "secondary";
    case "MONITOR":
      return "outline";
    case "PHONE":
    case "NETWORK":
    case "OTHER":
    default:
      return "secondary";
  }
}

function statusClassName(status: AssetStatus): string {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case "IN_REPAIR":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    case "STORED":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    case "RETIRED":
      return "bg-muted text-muted-foreground";
  }
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

// ── Page component ─────────────────────────────────────────────────────────────

export default function AssetsPage() {
  const t = useTranslations("assets");
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [companyId, setCompanyId] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetRow | null>(null);

  const { data, isLoading } = useAssets({
    search: search || undefined,
    status: status !== "all" ? status : undefined,
    type: type !== "all" ? type : undefined,
    companyId: companyId !== "all" ? companyId : undefined,
  });

  const deleteAsset = useDeleteAsset();
  const assets = (data as AssetRow[] | undefined) || [];

  function handleDelete(id: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    deleteAsset.mutate(id, {
      onSuccess: () => toast.success("Asset deleted"),
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Failed to delete asset",
        ),
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addAsset")}
        </Button>
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

            <div className="w-[200px]">
              <CompanySelect
                value={companyId}
                onValueChange={setCompanyId}
                placeholder={t("allCompanies")}
                allowAll
              />
            </div>

            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={tc("type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allTypes")}</SelectItem>
                {ASSET_TYPES.map((assetType) => (
                  <SelectItem key={assetType} value={assetType}>
                    {formatLabel(assetType)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={tc("status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allStatuses")}</SelectItem>
                {ASSET_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {formatLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Monitor className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t("noAssets")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {search ||
                status !== "all" ||
                type !== "all" ||
                companyId !== "all"
                  ? t("adjustFilters")
                  : t("addFirst")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("nameOrBrandModel")}</TableHead>
                  <TableHead>{t("type")}</TableHead>
                  <TableHead>{t("company")}</TableHead>
                  <TableHead>{t("serialNumber")}</TableHead>
                  <TableHead>{t("assignedTo")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("purchaseDate")}</TableHead>
                  <TableHead>{t("warrantyEnd")}</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <div className="font-medium">
                        {asset.name || t("unnamed")}
                      </div>
                      {(asset.brand || asset.model) && (
                        <div className="text-sm text-muted-foreground">
                          {[asset.brand, asset.model].filter(Boolean).join(" ")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={typeBadgeVariant(asset.type)}>
                        {formatLabel(asset.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {asset.company.shortName}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {asset.serialNumber || "\u2014"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {asset.assignedTo || "\u2014"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusClassName(asset.status)}
                      >
                        {formatLabel(asset.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {asset.purchaseDate
                        ? format(new Date(asset.purchaseDate), "dd MMM yyyy")
                        : "\u2014"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {asset.warrantyEnd
                        ? format(new Date(asset.warrantyEnd), "dd MMM yyyy")
                        : "\u2014"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingAsset(asset)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(asset.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Asset Dialog */}
      <CreateAssetDialog open={showCreate} onOpenChange={setShowCreate} />

      {/* Edit Asset Dialog */}
      {editingAsset && (
        <EditAssetDialog
          open={!!editingAsset}
          onOpenChange={(open) => {
            if (!open) setEditingAsset(null);
          }}
          asset={editingAsset}
        />
      )}
    </div>
  );
}

// ── Create Asset Dialog ────────────────────────────────────────────────────────

function CreateAssetDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createAsset = useCreateAsset();
  const t = useTranslations("assets");
  const tc = useTranslations("common");

  const form = useForm<AssetFormData>({
    resolver: typedResolver(assetFormSchema),
    defaultValues: {
      companyId: "",
      type: "OTHER",
      brand: "",
      model: "",
      name: "",
      serialNumber: "",
      purchaseDate: "",
      warrantyEnd: "",
      assignedTo: "",
      status: "ACTIVE",
      notes: "",
    },
  });

  async function onSubmit(data: AssetFormData) {
    try {
      const payload = {
        ...data,
        purchaseDate: data.purchaseDate || undefined,
        warrantyEnd: data.warrantyEnd || undefined,
      };
      await createAsset.mutateAsync(payload);
      toast.success("Asset created");
      form.reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create asset",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("addAsset")}</DialogTitle>
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
            <Label htmlFor="asset-name">{tc("name")}</Label>
            <Input id="asset-name" {...form.register("name")} />
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
                      {formatLabel(assetType)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tc("status")}</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v as AssetStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {formatLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Brand & Model */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset-brand">{tc("brand")}</Label>
              <Input id="asset-brand" {...form.register("brand")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-model">{tc("model")}</Label>
              <Input id="asset-model" {...form.register("model")} />
            </div>
          </div>

          {/* Serial Number & Assigned To */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset-serial">{t("serialNumber")}</Label>
              <Input id="asset-serial" {...form.register("serialNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-assigned">{t("assignedTo")}</Label>
              <Input id="asset-assigned" {...form.register("assignedTo")} />
            </div>
          </div>

          {/* Purchase Date & Warranty End */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset-purchase">{t("purchaseDate")}</Label>
              <Input
                id="asset-purchase"
                type="date"
                {...form.register("purchaseDate")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-warranty">{t("warrantyEnd")}</Label>
              <Input
                id="asset-warranty"
                type="date"
                {...form.register("warrantyEnd")}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="asset-notes">{tc("notes")}</Label>
            <Textarea id="asset-notes" rows={3} {...form.register("notes")} />
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
            <Button type="submit" disabled={createAsset.isPending}>
              {createAsset.isPending ? tc("creating") : t("createAsset")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
