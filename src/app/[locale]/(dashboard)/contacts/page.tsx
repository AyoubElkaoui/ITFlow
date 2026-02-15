"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { typedResolver } from "@/lib/form-utils";
import {
  contactCreateSchema,
  type ContactCreateInput,
} from "@/lib/validations";
import {
  useContacts,
  useCreateContact,
  useDeleteContact,
} from "@/hooks/use-contacts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { CompanySelect } from "@/components/shared/company-select";
import { toast } from "sonner";
import { Plus, Search, Users, Trash2, Mail, Phone, Pencil } from "lucide-react";
import { EditContactDialog } from "@/components/contacts/edit-contact-dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContactRow {
  id: string;
  companyId: string;
  name: string;
  email: string | null;
  phone: string | null;
  function: string | null;
  isPrimary: boolean;
  isActive: boolean;
  company: {
    id: string;
    shortName: string;
    name: string;
  };
}

// ---------------------------------------------------------------------------
// CreateContactDialog (internal component)
// ---------------------------------------------------------------------------

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateContactDialog({ open, onOpenChange }: CreateContactDialogProps) {
  const createContact = useCreateContact();
  const t = useTranslations("contacts");
  const tc = useTranslations("common");
  const ttoast = useTranslations("toasts");

  const form = useForm<ContactCreateInput>({
    resolver: typedResolver(contactCreateSchema),
    defaultValues: {
      companyId: "",
      name: "",
      email: "",
      phone: "",
      function: "",
      isPrimary: false,
      isActive: true,
    },
  });

  async function onSubmit(data: ContactCreateInput) {
    try {
      await createContact.mutateAsync(data);
      toast.success(ttoast("created", { entity: "Contact" }));
      form.reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : ttoast("failed", { action: "create", entity: "contact" }),
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("addContact")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyId">{tc("company")} *</Label>
            <Controller
              control={form.control}
              name="companyId"
              render={({ field }) => (
                <CompanySelect
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={tc("selectCompany")}
                />
              )}
            />
            {form.formState.errors.companyId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.companyId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">{tc("name")} *</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">{tc("email")}</Label>
              <Input id="email" type="email" {...form.register("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{tc("phone")}</Label>
              <Input id="phone" {...form.register("phone")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="function">{t("functionRole")}</Label>
            <Input
              id="function"
              placeholder={t("functionPlaceholder")}
              {...form.register("function")}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="isPrimary"
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              {...form.register("isPrimary")}
            />
            <Label htmlFor="isPrimary" className="font-normal">
              {t("primaryContact")}
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={createContact.isPending}>
              {createContact.isPending ? tc("creating") : t("createContact")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// ContactsPage
// ---------------------------------------------------------------------------

export default function ContactsPage() {
  const t = useTranslations("contacts");
  const tc = useTranslations("common");
  const ttoast = useTranslations("toasts");
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactRow | null>(null);

  const { data: contacts, isLoading } = useContacts(
    companyFilter !== "all" ? companyFilter : undefined,
    search || undefined,
  );
  const deleteContact = useDeleteContact();

  const contactList = (contacts || []) as ContactRow[];

  function handleDelete(id: string) {
    if (!confirm("Delete this contact?")) return;
    deleteContact.mutate(id, {
      onSuccess: () => toast.success(ttoast("deleted", { entity: "Contact" })),
      onError: (err) =>
        toast.error(
          err instanceof Error
            ? err.message
            : ttoast("failed", { action: "delete", entity: "contact" }),
        ),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addContact")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="w-[220px]">
              <CompanySelect
                value={companyFilter}
                onValueChange={setCompanyFilter}
                placeholder={t("filterByCompany")}
                allowAll
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : contactList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t("noContacts")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {search || companyFilter !== "all"
                  ? t("adjustSearch")
                  : t("addFirst")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("company")}</TableHead>
                  <TableHead>{t("email")}</TableHead>
                  <TableHead>{t("phone")}</TableHead>
                  <TableHead>{t("function")}</TableHead>
                  <TableHead className="text-center">
                    {t("primaryContact")}
                  </TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {contactList.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{contact.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {contact.company?.shortName || "\u2014"}
                    </TableCell>
                    <TableCell>
                      {contact.email ? (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          {contact.email}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          \u2014
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.phone ? (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          {contact.phone}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          \u2014
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {contact.function || "\u2014"}
                    </TableCell>
                    <TableCell className="text-center">
                      {contact.isPrimary && (
                        <Badge variant="default" className="text-xs">
                          {t("primaryContact")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          onClick={() => setEditingContact(contact)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(contact.id)}
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

      <CreateContactDialog open={showCreate} onOpenChange={setShowCreate} />

      {editingContact && (
        <EditContactDialog
          open={!!editingContact}
          onOpenChange={(open) => {
            if (!open) setEditingContact(null);
          }}
          contact={editingContact}
        />
      )}
    </div>
  );
}
