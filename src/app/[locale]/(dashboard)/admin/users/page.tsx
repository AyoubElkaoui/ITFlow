"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { typedResolver } from "@/lib/form-utils";
import {
  userCreateSchema,
  userUpdateSchema,
  resetPasswordSchema,
  type UserCreateInput,
  type UserUpdateInput,
} from "@/lib/validations";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useResetPassword,
} from "@/hooks/use-users";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Shield, UserCog, Pencil, KeyRound, Users } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
  isActive: boolean;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    createdTickets: number;
    timeEntries: number;
  };
}

// ---------------------------------------------------------------------------
// CreateUserDialog
// ---------------------------------------------------------------------------

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const createUser = useCreateUser();
  const t = useTranslations("admin.users");
  const tc = useTranslations("common");

  const form = useForm<UserCreateInput>({
    resolver: typedResolver(userCreateSchema),
    defaultValues: {
      email: "",
      name: "",
      password: "",
      role: "USER",
    },
  });

  async function onSubmit(data: UserCreateInput) {
    try {
      await createUser.mutateAsync(data);
      toast.success("User created");
      form.reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("addUser")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-name">Name *</Label>
            <Input id="create-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-email">Email *</Label>
            <Input id="create-email" type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-password">Password *</Label>
            <Input
              id="create-password"
              type="password"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-role">Role</Label>
            <Select
              value={form.watch("role")}
              onValueChange={(val) =>
                form.setValue("role", val as "ADMIN" | "USER")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// EditUserDialog
// ---------------------------------------------------------------------------

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRow;
}

function EditUserDialog({ open, onOpenChange, user }: EditUserDialogProps) {
  const updateUser = useUpdateUser(user.id);

  const form = useForm<UserUpdateInput>({
    resolver: typedResolver(userUpdateSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });

  async function onSubmit(data: UserUpdateInput) {
    try {
      await updateUser.mutateAsync(data);
      toast.success("User updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-role">Role</Label>
            <Select
              value={form.watch("role")}
              onValueChange={(val) =>
                form.setValue("role", val as "ADMIN" | "USER")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// ResetPasswordDialog
// ---------------------------------------------------------------------------

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRow;
}

function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
}: ResetPasswordDialogProps) {
  const resetPassword = useResetPassword(user.id);

  const form = useForm<{ password: string; confirm: string }>({
    resolver: typedResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirm: "",
    },
  });

  async function onSubmit(data: { password: string; confirm: string }) {
    if (data.password !== data.confirm) {
      form.setError("confirm", { message: "Passwords do not match" });
      return;
    }
    try {
      await resetPassword.mutateAsync({ password: data.password });
      toast.success("Password reset successfully");
      form.reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reset password",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset Password for {user.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-password">New Password *</Label>
            <Input
              id="reset-password"
              type="password"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-confirm">Confirm Password *</Label>
            <Input
              id="reset-confirm"
              type="password"
              {...form.register("confirm")}
            />
            {form.formState.errors.confirm && (
              <p className="text-xs text-destructive">
                {form.formState.errors.confirm.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={resetPassword.isPending}>
              {resetPassword.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// UsersPage
// ---------------------------------------------------------------------------

export default function UsersPage() {
  const t = useTranslations("admin.users");
  const tc = useTranslations("common");
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);

  const { data: users, isLoading } = useUsers();
  const queryClient = useQueryClient();
  const userList = (users || []) as UserRow[];

  async function handleToggleActive(user: UserRow) {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "Request failed");
      }
      toast.success(user.isActive ? "User deactivated" : "User activated");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to toggle user status",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {t("description")}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : userList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t("noUsers")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t("addFirst")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("email")}</TableHead>
                  <TableHead>{t("role")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="text-center">{t("tickets")}</TableHead>
                  <TableHead className="text-center">{t("timeEntries")}</TableHead>
                  <TableHead>{t("created")}</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {userList.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.role === "ADMIN" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {user.role === "ADMIN" ? (
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Admin
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <UserCog className="h-3 w-3" />
                            User
                          </span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.isActive ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {user.isActive ? tc("active") : tc("inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {user._count.createdTickets}
                    </TableCell>
                    <TableCell className="text-center">
                      {user._count.timeEntries}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          title="Edit user"
                          onClick={() => setEditingUser(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          title="Reset password"
                          onClick={() => setResetUser(user)}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${
                            user.isActive
                              ? "text-muted-foreground hover:text-destructive"
                              : "text-muted-foreground hover:text-green-600"
                          }`}
                          title={user.isActive ? "Deactivate" : "Activate"}
                          onClick={() => handleToggleActive(user)}
                        >
                          <UserCog className="h-4 w-4" />
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

      <CreateUserDialog open={showCreate} onOpenChange={setShowCreate} />

      {editingUser && (
        <EditUserDialog
          open={!!editingUser}
          onOpenChange={(open) => {
            if (!open) setEditingUser(null);
          }}
          user={editingUser}
        />
      )}

      {resetUser && (
        <ResetPasswordDialog
          open={!!resetUser}
          onOpenChange={(open) => {
            if (!open) setResetUser(null);
          }}
          user={resetUser}
        />
      )}
    </div>
  );
}
