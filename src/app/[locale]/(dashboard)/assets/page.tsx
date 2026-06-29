"use client";

import { useTranslations } from "next-intl";

import { Fragment, useMemo, useState } from "react";
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
import { Plus, Search, Monitor, Trash2, Pencil, Package, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
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

// Een voorraad-uitgifte maakt één Asset-rij per stuk aan. Identieke assets
// (zelfde bedrijf + type + naam + persoon) groeperen we tot één regel met een
// aantal-badge; uitklappen toont de losse stuks met datum + eigen acties.
interface AssetGroup {
  key: string;
  name: string;
  type: AssetType;
  company: { id: string; shortName: string; name: string };
  assignedTo: string | null;
  units: AssetRow[];
}

function groupAssets(assets: AssetRow[]): AssetGroup[] {
  const groups = new Map<string, AssetGroup>();
  for (const a of assets) {
    const key = `${a.companyId}|${a.type}|${a.name}|${a.assignedTo ?? ""}`;
    const g = groups.get(key);
    if (g) {
      g.units.push(a);
    } else {
      groups.set(key, {
        key,
        name: a.name,
        type: a.type,
        company: a.company,
        assignedTo: a.assignedTo,
        units: [a],
      });
    }
  }
  return [...groups.values()];
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useAssets({
    search: search || undefined,
    type: type !== "all" ? type : undefined,
    companyId: companyId !== "all" ? companyId : undefined,
  });

  const deleteAsset = useDeleteAsset();
  const assets = (data as AssetRow[] | undefined) || [];

  const totalCount = assets.length;
  const groups = useMemo(() => groupAssets(assets), [assets]);

  function toggleGroup(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

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
            <>
              {/* Mobiele kaartweergave */}
              <div className="md:hidden space-y-2">
                {groups.map((group) => {
                  const multi = group.units.length > 1;
                  const isOpen = expanded.has(group.key);
                  return (
                    <div key={group.key} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          className="min-w-0 text-left"
                          onClick={() => multi ? toggleGroup(group.key) : setEditingAsset(group.units[0])}
                        >
                          <p className="font-medium text-sm flex items-center gap-1.5">
                            {multi && (
                              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                            )}
                            {group.name}
                            {multi && <Badge variant="secondary" className="text-xs">×{group.units.length}</Badge>}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={typeBadgeVariant(group.type)} className="text-xs">{t(group.type)}</Badge>
                            <span className="text-xs text-muted-foreground">{group.company.shortName}</span>
                          </div>
                          {group.assignedTo && (
                            <p className="text-xs text-muted-foreground mt-0.5">{group.assignedTo}</p>
                          )}
                        </button>
                        {!multi && (
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingAsset(group.units[0])}>
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(group.units[0].id)}>
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        )}
                      </div>
                      {multi && isOpen && (
                        <div className="mt-2 space-y-1.5 border-t pt-2">
                          {group.units.map((unit, i) => (
                            <div key={unit.id} className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-muted-foreground">
                                #{i + 1} · {format(new Date(unit.createdAt), "dd MMM yyyy")}
                              </span>
                              <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingAsset(unit)}>
                                  <Pencil className="h-3 w-3 text-muted-foreground" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(unit.id)}>
                                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop tabelweergave */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>{t("name")}</TableHead>
                      <TableHead>{t("type")}</TableHead>
                      <TableHead>{t("company")}</TableHead>
                      <TableHead>{t("assignedTo")}</TableHead>
                      <TableHead className="w-[80px]">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((group) => {
                      const multi = group.units.length > 1;
                      const isOpen = expanded.has(group.key);
                      return (
                        <Fragment key={group.key}>
                          <TableRow
                            className={multi ? "cursor-pointer" : ""}
                            onClick={multi ? () => toggleGroup(group.key) : undefined}
                          >
                            <TableCell>
                              {multi && (
                                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium flex items-center gap-2">
                                {group.name}
                                {multi && <Badge variant="secondary" className="text-xs">×{group.units.length}</Badge>}
                              </div>
                            </TableCell>
                            <TableCell><Badge variant={typeBadgeVariant(group.type)}>{t(group.type)}</Badge></TableCell>
                            <TableCell className="text-sm text-muted-foreground">{group.company.shortName}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{group.assignedTo || "—"}</TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              {!multi && (
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => setEditingAsset(group.units[0])}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDelete(group.units[0].id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                          {multi && isOpen && group.units.map((unit, i) => (
                            <TableRow key={unit.id} className="bg-muted/40">
                              <TableCell />
                              <TableCell className="text-sm text-muted-foreground pl-8">
                                #{i + 1} · {format(new Date(unit.createdAt), "dd MMM yyyy")}
                              </TableCell>
                              <TableCell />
                              <TableCell />
                              <TableCell />
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => setEditingAsset(unit)}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDelete(unit.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
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
