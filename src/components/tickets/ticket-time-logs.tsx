"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Play, Square, Plus, Trash2, Pencil, Check, X, Clock } from "lucide-react";

import {
  useTicketTimeLogs,
  useStartWork,
  useStopWork,
  useAddManualLog,
  useUpdateLog,
  useDeleteLog,
  type TicketTimeLog,
} from "@/hooks/use-ticket-time-logs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// Rauwe minuten -> "1u 15m" / "45m".
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return m > 0 ? `${h}u ${m}m` : `${h}u`;
  return `${m}m`;
}

function elapsedMinutes(startedAt: string): number {
  return Math.max(1, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000));
}

interface Props {
  ticketId: string;
  currentUserId?: string;
}

export function TicketTimeLogs({ ticketId, currentUserId }: Props) {
  const { data: logs } = useTicketTimeLogs(ticketId);
  const start = useStartWork(ticketId);
  const stop = useStopWork(ticketId);
  const addManual = useAddManualLog(ticketId);
  const update = useUpdateLog(ticketId);
  const del = useDeleteLog(ticketId);

  const [editId, setEditId] = useState<string | null>(null);
  const [editMinutes, setEditMinutes] = useState("");
  const [editNote, setEditNote] = useState("");

  // Manual add form
  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [addMinutes, setAddMinutes] = useState("");
  const [addNote, setAddNote] = useState("");

  const list = logs ?? [];
  const running = list.find((l) => l.endedAt === null);
  const myRunning = running && running.userId === currentUserId ? running : null;

  const totalMinutes = list.reduce(
    (sum, l) => sum + (l.minutes ?? elapsedMinutes(l.startedAt)),
    0,
  );

  async function handleStart() {
    try {
      await start.mutateAsync();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kon werk niet starten");
    }
  }

  async function handleStop(logId: string) {
    try {
      await stop.mutateAsync(logId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kon niet stoppen");
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const minutes = parseInt(addMinutes, 10);
    if (!minutes || minutes <= 0) return;
    try {
      await addManual.mutateAsync({
        // Middag lokaal zodat de kalenderdag klopt in het dagafsluiting-voorstel.
        startedAt: new Date(`${addDate}T12:00:00`),
        minutes,
        note: addNote || undefined,
      });
      setAddMinutes("");
      setAddNote("");
      setShowAdd(false);
      toast.success("Tijd toegevoegd");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kon niet toevoegen");
    }
  }

  function startEdit(log: TicketTimeLog) {
    setEditId(log.id);
    setEditMinutes(String(log.minutes ?? elapsedMinutes(log.startedAt)));
    setEditNote(log.note ?? "");
  }

  async function saveEdit(logId: string) {
    const minutes = parseInt(editMinutes, 10);
    if (!minutes || minutes <= 0) return;
    try {
      await update.mutateAsync({ logId, minutes, note: editNote || null });
      setEditId(null);
      toast.success("Bijgewerkt");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kon niet bijwerken");
    }
  }

  return (
    <div className="space-y-4">
      {/* Totaal + Start/Stop */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Totaal:</span>
          <span className="font-semibold tabular-nums">
            {formatDuration(totalMinutes)}
          </span>
        </div>
        {myRunning ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleStop(myRunning.id)}
            disabled={stop.isPending}
          >
            <Square className="mr-1.5 h-4 w-4" />
            Stop ({formatDuration(elapsedMinutes(myRunning.startedAt))})
          </Button>
        ) : (
          <Button size="sm" onClick={handleStart} disabled={start.isPending}>
            <Play className="mr-1.5 h-4 w-4" />
            Start werk
          </Button>
        )}
      </div>

      {/* Logs */}
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nog geen tijd geregistreerd.
        </p>
      ) : (
        <div className="space-y-1.5">
          {list.map((log) => {
            const isRunning = log.endedAt === null;
            const mins = log.minutes ?? elapsedMinutes(log.startedAt);
            const editing = editId === log.id;
            return (
              <div
                key={log.id}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground tabular-nums w-24 shrink-0">
                  {format(new Date(log.startedAt), "dd MMM HH:mm")}
                </span>

                {editing ? (
                  <>
                    <Input
                      type="number"
                      min="1"
                      value={editMinutes}
                      onChange={(e) => setEditMinutes(e.target.value)}
                      className="h-8 w-20"
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                    <Input
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Notitie"
                      className="h-8 flex-1"
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit(log.id)}>
                      <Check className="h-4 w-4 text-emerald-600" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditId(null)}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="font-medium tabular-nums w-16 shrink-0">
                      {formatDuration(mins)}
                    </span>
                    {isRunning && (
                      <Badge variant="outline" className="border-emerald-400 text-emerald-600">
                        loopt
                      </Badge>
                    )}
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {log.note || ""}
                    </span>
                    {log.user && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {log.user.name}
                      </span>
                    )}
                    {isRunning ? (
                      <Button size="sm" variant="ghost" onClick={() => handleStop(log.id)}>
                        <Square className="mr-1 h-3.5 w-3.5" />
                        Stop
                      </Button>
                    ) : (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(log)}>
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => del.mutate(log.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Handmatig toevoegen */}
      {showAdd ? (
        <form onSubmit={handleAdd} className="space-y-2 rounded-lg border border-border p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Datum</Label>
              <Input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Minuten</Label>
              <Input
                type="number"
                min="1"
                placeholder="bv. 30"
                value={addMinutes}
                onChange={(e) => setAddMinutes(e.target.value)}
              />
            </div>
          </div>
          <Input
            placeholder="Notitie (bv. telefonisch)"
            value={addNote}
            onChange={(e) => setAddNote(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowAdd(false)}>
              Annuleren
            </Button>
            <Button type="submit" size="sm" disabled={addManual.isPending || !addMinutes}>
              Toevoegen
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Handmatig toevoegen
        </Button>
      )}
    </div>
  );
}
