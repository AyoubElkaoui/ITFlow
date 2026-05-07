"use client";

import { useState } from "react";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, type Task } from "@/hooks/use-tasks";
import { useUsers } from "@/hooks/use-users";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TicketSelect } from "@/components/shared/ticket-select";
import { Plus, Trash2, Pencil, CalendarDays, User, Link2, AlertTriangle, CheckCircle2, Clock, Loader } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { format, isAfter, isBefore, startOfDay } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { status: "TODO" as const, label: "Te doen", icon: <Loader className="h-3.5 w-3.5" />, color: "border-t-slate-400" },
  { status: "IN_PROGRESS" as const, label: "Bezig", icon: <Clock className="h-3.5 w-3.5" />, color: "border-t-blue-500" },
  { status: "WAITING" as const, label: "Wacht op", icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "border-t-orange-400" },
  { status: "DONE" as const, label: "Klaar", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "border-t-green-500" },
] as const;

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  NORMAL: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Laag", NORMAL: "Normaal", HIGH: "Hoog", URGENT: "Urgent",
};

interface TaskFormData {
  title: string;
  description: string;
  priority: Task["priority"];
  dueDate: string;
  assignedToId: string;
  ticketId: string;
}

const emptyForm: TaskFormData = {
  title: "", description: "", priority: "NORMAL",
  dueDate: "", assignedToId: "", ticketId: "",
};

export default function TasksPage() {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: users = [] } = useUsers();
  const createTask = useCreateTask();
  const deleteTask = useDeleteTask();

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormData>(emptyForm);

  const userList = (users as { id: string; name: string }[]);

  function openCreate() {
    setForm(emptyForm);
    setEditingTask(null);
    setShowForm(true);
  }

  function openEdit(task: Task) {
    setForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      assignedToId: task.assignedToId || "",
      ticketId: task.ticketId || "",
    });
    setEditingTask(task);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;

    const data = {
      title: form.title.trim(),
      description: form.description || null,
      priority: form.priority,
      dueDate: form.dueDate || null,
      assignedToId: form.assignedToId || null,
      ticketId: form.ticketId || null,
    };

    try {
      if (editingTask) {
        await fetch(`/api/tasks/${editingTask.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        toast.success("Taak bijgewerkt");
      } else {
        await createTask.mutateAsync(data);
        toast.success("Taak aangemaakt");
      }
      setShowForm(false);
    } catch {
      toast.error("Opslaan mislukt");
    }
  }

  async function handleStatusChange(task: Task, status: Task["status"]) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    toast.success(`Verplaatst naar ${COLUMNS.find(c => c.status === status)?.label}`);
  }

  async function handleDelete(task: Task) {
    if (!confirm(`Taak "${task.title}" verwijderen?`)) return;
    await deleteTask.mutateAsync(task.id);
    toast.success("Taak verwijderd");
  }

  const today = startOfDay(new Date());

  function dueDateStyle(dueDate: string | null) {
    if (!dueDate) return "";
    const d = startOfDay(new Date(dueDate));
    if (isBefore(d, today)) return "text-red-500 font-medium";
    if (format(d, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) return "text-orange-500 font-medium";
    return "text-muted-foreground";
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Taken</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nieuwe taak
        </Button>
      </div>

      {/* Kanban board */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map(col => (
            <div key={col.status} className="h-48 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.status);
            return (
              <div key={col.status} className={cn("flex flex-col rounded-xl border border-t-4 bg-muted/30", col.color)}>
                {/* Header */}
                <div className="flex items-center gap-2 px-3 py-3">
                  <span className="text-muted-foreground">{col.icon}</span>
                  <h2 className="text-sm font-semibold">{col.label}</h2>
                  <Badge variant="secondary" className="ml-auto text-xs">{colTasks.length}</Badge>
                </div>

                {/* Tasks */}
                <div className="flex-1 px-2 pb-2 space-y-2 min-h-[120px] overflow-y-auto max-h-[calc(100vh-280px)]">
                  {colTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground/50 text-center py-6">Geen taken</p>
                  ) : colTasks.map(task => (
                    <Card key={task.id} className="shadow-none hover:shadow-sm transition-shadow cursor-pointer group">
                      <CardContent className="p-3 space-y-2">
                        {/* Title + actions */}
                        <div className="flex items-start gap-2">
                          <p className="text-sm font-medium flex-1 leading-tight">{task.title}</p>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                            <button onClick={() => openEdit(task)} className="text-muted-foreground hover:text-foreground p-0.5">
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button onClick={() => handleDelete(task)} className="text-muted-foreground hover:text-destructive p-0.5">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {/* Description */}
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                        )}

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={cn("text-xs px-1.5 py-0.5 rounded", PRIORITY_COLORS[task.priority])}>
                            {PRIORITY_LABELS[task.priority]}
                          </span>
                          {task.assignedTo && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              {task.assignedTo.name.split(" ")[0]}
                            </span>
                          )}
                          {task.dueDate && (
                            <span className={cn("flex items-center gap-1 text-xs", dueDateStyle(task.dueDate))}>
                              <CalendarDays className="h-3 w-3" />
                              {format(new Date(task.dueDate), "d MMM", { locale: nl })}
                            </span>
                          )}
                          {task.ticket && (
                            <Link href={`/tickets/${task.ticket.id}`} className="flex items-center gap-1 text-xs text-primary hover:underline" onClick={e => e.stopPropagation()}>
                              <Link2 className="h-3 w-3" />
                              #{String(task.ticket.ticketNumber).padStart(3, "0")}
                            </Link>
                          )}
                        </div>

                        {/* Move to */}
                        <Select value={task.status} onValueChange={(v) => handleStatusChange(task, v as Task["status"])}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COLUMNS.map(c => (
                              <SelectItem key={c.status} value={c.status} className="text-xs">
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Quick add */}
                <button
                  onClick={openCreate}
                  className="flex items-center gap-1 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors rounded-b-xl"
                >
                  <Plus className="h-3 w-3" />
                  Taak toevoegen
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Taak bewerken" : "Nieuwe taak"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Titel *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Wat moet er gedaan worden?"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Omschrijving</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Extra details..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prioriteit</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as Task["priority"] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Laag</SelectItem>
                    <SelectItem value="NORMAL">Normaal</SelectItem>
                    <SelectItem value="HIGH">Hoog</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Toegewezen aan</Label>
              <Select value={form.assignedToId || "none"} onValueChange={v => setForm(f => ({ ...f, assignedToId: v === "none" ? "" : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Kies medewerker" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Niemand —</SelectItem>
                  {userList.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ticket koppelen (optioneel)</Label>
              <TicketSelect
                value={form.ticketId || "none"}
                onValueChange={v => setForm(f => ({ ...f, ticketId: v === "none" ? "" : v }))}
                placeholder="Zoek ticket..."
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuleren</Button>
              <Button type="submit" disabled={createTask.isPending}>
                {editingTask ? "Opslaan" : "Aanmaken"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
