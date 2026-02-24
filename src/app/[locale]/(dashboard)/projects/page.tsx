"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useCreateProjectTask,
  useUpdateProjectTask,
  useDeleteProjectTask,
  type Project,
} from "@/hooks/use-projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { CompanySelect } from "@/components/shared/company-select";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Plus,
  Trash2,
  Building2,
  Calendar,
  CheckCircle2,
  Circle,
  Loader2,
  FolderKanban,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { status: "PLANNING", color: "bg-slate-500" },
  { status: "ACTIVE", color: "bg-blue-500" },
  { status: "ON_HOLD", color: "bg-amber-500" },
  { status: "COMPLETED", color: "bg-green-500" },
] as const;

function priorityColor(p: string) {
  switch (p) {
    case "URGENT":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "HIGH":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "NORMAL":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400";
  }
}

export default function ProjectsPage() {
  const t = useTranslations("projects");
  const tc = useTranslations("common");
  const tp = useTranslations("priority");
  const ttoast = useTranslations("toasts");

  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [createOpen, setCreateOpen] = useState(false);
  const [detailProject, setDetailProject] = useState<Project | null>(null);

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState("NORMAL");
  const [newCompanyId, setNewCompanyId] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  function resetCreateForm() {
    setNewTitle("");
    setNewDesc("");
    setNewPriority("NORMAL");
    setNewCompanyId("");
    setNewDueDate("");
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    try {
      await createProject.mutateAsync({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        status: "PLANNING",
        priority: newPriority as "LOW" | "NORMAL" | "HIGH" | "URGENT",
        companyId: newCompanyId || undefined,
        dueDate: newDueDate ? new Date(newDueDate) : undefined,
      });
      toast.success(ttoast("created", { entity: t("project") }));
      setCreateOpen(false);
      resetCreateForm();
    } catch {
      toast.error(ttoast("failed", { action: "create", entity: "project" }));
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteProject.mutateAsync(id);
      toast.success(ttoast("deleted", { entity: t("project") }));
      if (detailProject?.id === id) setDetailProject(null);
    } catch {
      toast.error(ttoast("failed", { action: "delete", entity: "project" }));
    }
  }

  function getColumnProjects(status: string) {
    return (projects || []).filter((p) => p.status === status);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t("newProject")}
        </Button>
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const colProjects = getColumnProjects(col.status);
          return (
            <div key={col.status} className="space-y-3">
              {/* Column header */}
              <div className="flex items-center gap-2">
                <div className={cn("h-2.5 w-2.5 rounded-full", col.color)} />
                <h2 className="text-sm font-semibold">{t(col.status)}</h2>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {colProjects.length}
                </Badge>
              </div>

              {/* Cards */}
              <ScrollArea className="h-[calc(100vh-220px)]">
                <div className="space-y-2 pr-2">
                  {colProjects.map((project) => (
                    <Card
                      key={project.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setDetailProject(project)}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-medium leading-tight">
                            {project.title}
                          </h3>
                          <Badge
                            variant="secondary"
                            className={cn("text-[10px] shrink-0", priorityColor(project.priority))}
                          >
                            {tp(project.priority)}
                          </Badge>
                        </div>

                        {project.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {project.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {project.company && (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              <span className="truncate">{project.company.shortName}</span>
                            </div>
                          )}
                          {project.dueDate && (
                            <div className="flex items-center gap-1 ml-auto">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {new Date(project.dueDate).toLocaleDateString("nl-NL", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Task progress */}
                        {project.tasks.length > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-1.5">
                              <div
                                className="bg-primary rounded-full h-1.5 transition-all"
                                style={{
                                  width: `${(project.tasks.filter((t) => t.completed).length / project.tasks.length) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {project.tasks.filter((t) => t.completed).length}/{project.tasks.length}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {colProjects.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-8">
                      {t("noProjects")}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("newProject")}</DialogTitle>
            <DialogDescription>{t("newProjectDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{tc("name")} *</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={t("titlePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{tc("description")}</Label>
              <Textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
                placeholder={t("descriptionPlaceholder")}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{tc("priority")}</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">{tp("LOW")}</SelectItem>
                    <SelectItem value="NORMAL">{tp("NORMAL")}</SelectItem>
                    <SelectItem value="HIGH">{tp("HIGH")}</SelectItem>
                    <SelectItem value="URGENT">{tp("URGENT")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("dueDate")}</Label>
                <Input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{tc("company")}</Label>
              <CompanySelect
                value={newCompanyId}
                onValueChange={setNewCompanyId}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                {tc("cancel")}
              </Button>
              <Button onClick={handleCreate} disabled={!newTitle.trim() || createProject.isPending}>
                {createProject.isPending ? tc("creating") : tc("create")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      {detailProject && (
        <ProjectDetailSheet
          project={detailProject}
          open={!!detailProject}
          onOpenChange={(open) => {
            if (!open) setDetailProject(null);
          }}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

// ── Detail Sheet ──

function ProjectDetailSheet({
  project,
  open,
  onOpenChange,
  onDelete,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("projects");
  const tc = useTranslations("common");
  const tp = useTranslations("priority");
  const ttoast = useTranslations("toasts");

  const updateProject = useUpdateProject(project.id);
  const createTask = useCreateProjectTask(project.id);
  const updateTask = useUpdateProjectTask(project.id);
  const deleteTask = useDeleteProjectTask(project.id);

  // Refresh project data
  const { data: freshProject } = useProjects();
  const currentProject = freshProject?.find((p) => p.id === project.id) || project;

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(currentProject.notes || "");

  async function handleStatusChange(status: string) {
    try {
      await updateProject.mutateAsync({ status: status as "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED" });
      toast.success(ttoast("statusUpdated", { status: t(status) }));
    } catch {
      toast.error(ttoast("failed", { action: "update", entity: "project" }));
    }
  }

  async function handleAddTask() {
    if (!newTaskTitle.trim()) return;
    try {
      await createTask.mutateAsync({ title: newTaskTitle.trim() });
      setNewTaskTitle("");
    } catch {
      toast.error(ttoast("failed", { action: "create", entity: "task" }));
    }
  }

  async function handleToggleTask(taskId: string, completed: boolean) {
    try {
      await updateTask.mutateAsync({ taskId, completed });
    } catch {
      toast.error(ttoast("failed", { action: "update", entity: "task" }));
    }
  }

  async function handleDeleteTask(taskId: string) {
    try {
      await deleteTask.mutateAsync(taskId);
    } catch {
      toast.error(ttoast("failed", { action: "delete", entity: "task" }));
    }
  }

  async function handleSaveNotes() {
    try {
      await updateProject.mutateAsync({ notes: notes || undefined });
      setEditingNotes(false);
      toast.success(ttoast("updated", { entity: t("project") }));
    } catch {
      toast.error(ttoast("failed", { action: "update", entity: "project" }));
    }
  }

  const completedTasks = currentProject.tasks.filter((t) => t.completed).length;
  const totalTasks = currentProject.tasks.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">{currentProject.title}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-4">
          {/* Status selector */}
          <div className="space-y-2">
            <Label>{tc("status")}</Label>
            <Select
              value={currentProject.status}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PLANNING">{t("PLANNING")}</SelectItem>
                <SelectItem value="ACTIVE">{t("ACTIVE")}</SelectItem>
                <SelectItem value="ON_HOLD">{t("ON_HOLD")}</SelectItem>
                <SelectItem value="COMPLETED">{t("COMPLETED")}</SelectItem>
                <SelectItem value="CANCELLED">{t("CANCELLED")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{tc("priority")}</span>
              <Badge className={cn("ml-2", priorityColor(currentProject.priority))}>
                {tp(currentProject.priority)}
              </Badge>
            </div>
            {currentProject.company && (
              <div>
                <span className="text-muted-foreground">{tc("company")}</span>
                <span className="ml-2 font-medium">{currentProject.company.shortName}</span>
              </div>
            )}
            {currentProject.dueDate && (
              <div>
                <span className="text-muted-foreground">{t("dueDate")}</span>
                <span className="ml-2">
                  {new Date(currentProject.dueDate).toLocaleDateString("nl-NL")}
                </span>
              </div>
            )}
          </div>

          {currentProject.description && (
            <div className="space-y-1">
              <Label className="text-muted-foreground">{tc("description")}</Label>
              <p className="text-sm whitespace-pre-wrap">{currentProject.description}</p>
            </div>
          )}

          {/* Tasks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("tasks")}</h3>
              {totalTasks > 0 && (
                <span className="text-xs text-muted-foreground">
                  {completedTasks}/{totalTasks}
                </span>
              )}
            </div>

            {totalTasks > 0 && (
              <div className="bg-muted rounded-full h-1.5">
                <div
                  className="bg-primary rounded-full h-1.5 transition-all"
                  style={{
                    width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%`,
                  }}
                />
              </div>
            )}

            <div className="space-y-1">
              {currentProject.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 py-1.5 group"
                >
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={(checked) =>
                      handleToggleTask(task.id, !!checked)
                    }
                  />
                  <span
                    className={cn(
                      "flex-1 text-sm",
                      task.completed && "line-through text-muted-foreground",
                    )}
                  >
                    {task.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add task */}
            <div className="flex items-center gap-2">
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder={t("addTaskPlaceholder")}
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddTask();
                }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim() || createTask.isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{tc("notes")}</Label>
              {!editingNotes && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNotes(currentProject.notes || "");
                    setEditingNotes(true);
                  }}
                >
                  {tc("edit")}
                </Button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder={t("notesPlaceholder")}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveNotes}>
                    {tc("save")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingNotes(false)}
                  >
                    {tc("cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {currentProject.notes || t("noNotes")}
              </p>
            )}
          </div>

          {/* Delete */}
          <div className="border-t pt-4">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(currentProject.id)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {t("deleteProject")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
