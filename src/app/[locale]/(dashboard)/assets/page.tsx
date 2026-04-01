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
import { CompanySelect } from "@/components/shared/company-select";
import { Plus, Search, Monitor, Trash2, Pencil, Package } from "lucide-react";
import { toast } from "sonner";
import { EditAssetDialog } from "@/components/assets/edit-asset-dialog";

// -- Types --------------------------------------------------------------------

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

interface AssetRow {
  id: string;
  name: string;
  type: AssetType;
  assignedTo: string | null;
  companyId: string;
  company: { id: string; shortName: string; name: string };
  stockItemId: string | null;
  createdAt: string;
  _count: { ticketLinks: number };
}

// -- Zod schema for create form -----------------------------------------------

const assetFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
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
  companyId: z.string().min(1, "Company is required"),
  assignedTo: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetFormSchema>;

// -- Badge helpers ------------------------------------------------------------

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

// -- Page component -----------------------------------------------------------

export default function AssetsPage() {
  const t = useTranslations("assets");
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [companyId, setCompanyId] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetRow | null>(null);

  const { data, isLoading } = useAssets({
    search: search || undefined,
    type: type !== "all" ? type : undefined,
    companyId: companyId !== "all" ? companyId : undefined,
  });

  const deleteAsset = useDeleteAsset();
  const assets = (data as AssetRow[] | undefined) || [];

  const totalCount = assets.length;

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
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addAsset")}
        </Button>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("total")}</p>
                <p className="text-2xl font-bold">{totalCount}</p>
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
                <SelectValue placeholder={t("type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allTypes")}</SelectItem>
                {ASSET_TYPES.map((assetType) => (
                  <SelectItem key={assetType} value={assetType}>
                    {t(assetType)}
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
                {search || type !== "all" || companyId !== "all"
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
                    <TableHead>{t("type")}</TableHead>
                    <TableHead>{t("company")}</TableHead>
                    <TableHead>{t("assignedTo")}</TableHead>
                    <TableHead className="w-[80px]">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <div className="font-medium">{asset.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={typeBadgeVariant(asset.type)}>
                          {t(asset.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {asset.company.shortName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {asset.assignedTo || "\u2014"}
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
            </div>
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

// -- Create Asset Dialog ------------------------------------------------------

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
      name: "",
      type: "OTHER",
      companyId: "",
      assignedTo: "",
    },
  });

  async function onSubmit(data: AssetFormData) {
    try {
      const payload = {
        ...data,
        assignedTo: data.assignedTo || undefined,
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
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="asset-name">{t("name")} *</Label>
            <Input id="asset-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>{t("type")}</Label>
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

          {/* Company */}
          <div className="space-y-2">
            <Label>{t("company")} *</Label>
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

          {/* Assigned To */}
          <div className="space-y-2">
            <Label htmlFor="asset-assigned">{t("assignedTo")}</Label>
            <Input id="asset-assigned" {...form.register("assignedTo")} />
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
