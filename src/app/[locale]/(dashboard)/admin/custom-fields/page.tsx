"use client";

import { useTranslations } from "next-intl";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { typedResolver } from "@/lib/form-utils";
import {
  customFieldDefinitionCreateSchema,
  type CustomFieldDefinitionCreateInput,
} from "@/lib/validations";
import {
  useFieldDefinitions,
  useCreateFieldDef,
  useUpdateFieldDef,
  useDeleteFieldDef,
} from "@/hooks/use-custom-fields";
import type { CustomFieldEntity, CustomFieldType } from "@/generated/prisma/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, SlidersHorizontal } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FieldDefRow {
  id: string;
  entityType: CustomFieldEntity;
  name: string;
  label: string;
  fieldType: CustomFieldType;
  options: string[] | null;
  required: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const ENTITY_TYPES: CustomFieldEntity[] = ["TICKET", "COMPANY", "CONTACT", "ASSET"];
const FIELD_TYPES: CustomFieldType[] = [
  "TEXT",
  "NUMBER",
  "DATE",
  "SELECT",
  "CHECKBOX",
  "TEXTAREA",
];

const entityVariant: Record<
  CustomFieldEntity,
  "default" | "secondary" | "destructive" | "outline"
> = {
  TICKET: "default",
  COMPANY: "secondary",
  CONTACT: "outline",
  ASSET: "destructive",
};

// ---------------------------------------------------------------------------
// CreateFieldDefDialog
// ---------------------------------------------------------------------------

interface CreateFieldDefDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateFieldDefDialog({ open, onOpenChange }: CreateFieldDefDialogProps) {
  const createDef = useCreateFieldDef();
  const [optionsText, setOptionsText] = useState("");

  const form = useForm<CustomFieldDefinitionCreateInput>({
    resolver: typedResolver(customFieldDefinitionCreateSchema),
    defaultValues: {
      entityType: "TICKET",
      name: "",
      label: "",
      fieldType: "TEXT",
      options: [],
      required: false,
      sortOrder: 0,
    },
  });

  const watchFieldType = form.watch("fieldType");

  async function onSubmit(data: CustomFieldDefinitionCreateInput) {
    try {
      const payload = {
        ...data,
        options:
          data.fieldType === "SELECT" && optionsText.trim()
            ? optionsText.split(",").map((o) => o.trim()).filter(Boolean)
            : undefined,
      };
      await createDef.mutateAsync(payload);
      toast.success("Custom field created");
      form.reset();
      setOptionsText("");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create field");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Custom Field</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Entity Type *</Label>
              <Select
                value={form.watch("entityType")}
                onValueChange={(val) => form.setValue("entityType", val as CustomFieldEntity)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Field Type *</Label>
              <Select
                value={form.watch("fieldType")}
                onValueChange={(val) => form.setValue("fieldType", val as CustomFieldType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name *</Label>
              <Input id="create-name" {...form.register("name")} placeholder="field_name" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-label">Label *</Label>
              <Input id="create-label" {...form.register("label")} placeholder="Display Label" />
              {form.formState.errors.label && (
                <p className="text-xs text-destructive">{form.formState.errors.label.message}</p>
              )}
            </div>
          </div>

          {watchFieldType === "SELECT" && (
            <div className="space-y-2">
              <Label htmlFor="create-options">Options (comma-separated)</Label>
              <Input
                id="create-options"
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="Option 1, Option 2, Option 3"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-sortOrder">Sort Order</Label>
              <Input id="create-sortOrder" type="number" {...form.register("sortOrder")} />
            </div>

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.watch("required")}
                  onCheckedChange={(checked) => form.setValue("required", !!checked)}
                />
                Required field
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createDef.isPending}>
              {createDef.isPending ? "Creating..." : "Create Field"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// EditFieldDefDialog
// ---------------------------------------------------------------------------

interface EditFieldDefDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: FieldDefRow;
}

function EditFieldDefDialog({ open, onOpenChange, field }: EditFieldDefDialogProps) {
  const updateDef = useUpdateFieldDef(field.id);
  const [optionsText, setOptionsText] = useState(
    (field.options || []).join(", "),
  );

  const form = useForm<CustomFieldDefinitionCreateInput>({
    resolver: typedResolver(customFieldDefinitionCreateSchema),
    defaultValues: {
      entityType: field.entityType,
      name: field.name,
      label: field.label,
      fieldType: field.fieldType,
      required: field.required,
      sortOrder: field.sortOrder,
    },
  });

  const watchFieldType = form.watch("fieldType");

  useEffect(() => {
    form.reset({
      entityType: field.entityType,
      name: field.name,
      label: field.label,
      fieldType: field.fieldType,
      required: field.required,
      sortOrder: field.sortOrder,
    });
    setOptionsText((field.options || []).join(", "));
  }, [field, form]);

  async function onSubmit(data: CustomFieldDefinitionCreateInput) {
    try {
      const payload = {
        ...data,
        options:
          data.fieldType === "SELECT" && optionsText.trim()
            ? optionsText.split(",").map((o) => o.trim()).filter(Boolean)
            : undefined,
      };
      await updateDef.mutateAsync(payload);
      toast.success("Custom field updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update field");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Custom Field</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Entity Type *</Label>
              <Select
                value={form.watch("entityType")}
                onValueChange={(val) => form.setValue("entityType", val as CustomFieldEntity)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Field Type *</Label>
              <Select
                value={form.watch("fieldType")}
                onValueChange={(val) => form.setValue("fieldType", val as CustomFieldType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input id="edit-name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-label">Label *</Label>
              <Input id="edit-label" {...form.register("label")} />
              {form.formState.errors.label && (
                <p className="text-xs text-destructive">{form.formState.errors.label.message}</p>
              )}
            </div>
          </div>

          {watchFieldType === "SELECT" && (
            <div className="space-y-2">
              <Label htmlFor="edit-options">Options (comma-separated)</Label>
              <Input
                id="edit-options"
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-sortOrder">Sort Order</Label>
              <Input id="edit-sortOrder" type="number" {...form.register("sortOrder")} />
            </div>

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.watch("required")}
                  onCheckedChange={(checked) => form.setValue("required", !!checked)}
                />
                Required field
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateDef.isPending}>
              {updateDef.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// CustomFieldsPage
// ---------------------------------------------------------------------------

export default function CustomFieldsPage() {
  const t = useTranslations("admin.customFields");
  const tc = useTranslations("common");
  const [showCreate, setShowCreate] = useState(false);
  const [editingField, setEditingField] = useState<FieldDefRow | null>(null);
  const [filterEntity, setFilterEntity] = useState<string>("all");

  const { data: definitions, isLoading } = useFieldDefinitions(
    filterEntity !== "all" ? filterEntity : undefined,
  );
  const deleteField = useDeleteFieldDef();

  const fieldList = (definitions || []) as FieldDefRow[];

  async function handleDelete(field: FieldDefRow) {
    const confirmed = window.confirm(
      `Are you sure you want to delete the field "${field.label}"? All stored values for this field will also be deleted.`,
    );
    if (!confirmed) return;

    try {
      await deleteField.mutateAsync(field.id);
      toast.success("Custom field deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete field");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Field
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {t("description")}
              </span>
            </div>
            <Select value={filterEntity} onValueChange={setFilterEntity}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allEntities")}</SelectItem>
                {ENTITY_TYPES.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : fieldList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <SlidersHorizontal className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t("noFields")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t("createFirst")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("label")}</TableHead>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("entity")}</TableHead>
                  <TableHead>{t("type")}</TableHead>
                  <TableHead>{t("required")}</TableHead>
                  <TableHead>{t("order")}</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fieldList.map((field) => (
                  <TableRow key={field.id}>
                    <TableCell className="font-medium">{field.label}</TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {field.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={entityVariant[field.entityType]} className="text-xs">
                        {field.entityType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {field.fieldType}
                    </TableCell>
                    <TableCell className="text-sm">
                      {field.required ? "Yes" : "No"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {field.sortOrder}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          title="Edit field"
                          onClick={() => setEditingField(field)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Delete field"
                          onClick={() => handleDelete(field)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      <CreateFieldDefDialog open={showCreate} onOpenChange={setShowCreate} />

      {editingField && (
        <EditFieldDefDialog
          open={!!editingField}
          onOpenChange={(open) => {
            if (!open) setEditingField(null);
          }}
          field={editingField}
        />
      )}
    </div>
  );
}
