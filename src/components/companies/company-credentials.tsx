"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TicketSelect } from "@/components/shared/ticket-select";
import { Link } from "@/i18n/navigation";
import { Eye, EyeOff, Plus, Trash2, Copy, ExternalLink, Lock, Ticket } from "lucide-react";
import { toast } from "sonner";

interface Credential {
  id: string;
  label: string;
  username: string | null;
  password: string;
  url: string | null;
  notes: string | null;
  createdAt: string;
  createdBy: { name: string };
  ticket: { id: string; ticketNumber: number; subject: string } | null;
}

interface Props { companyId: string; }

const emptyForm = { label: "", username: "", password: "", url: "", notes: "", ticketId: "" };

export function CompanyCredentials({ companyId }: Props) {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  const [unlocked, setUnlocked] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState(emptyForm);

  const { data: credentials = [], isLoading } = useQuery<Credential[]>({
    queryKey: ["credentials", companyId],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/credentials`);
      if (!res.ok) throw new Error("Laden mislukt");
      return res.json();
    },
    enabled: unlocked && isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch(`/api/companies/${companyId}/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, ticketId: data.ticketId || null }),
      });
      if (!res.ok) throw new Error("Opslaan mislukt");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credentials", companyId] });
      toast.success("Wachtwoord opgeslagen");
      setShowForm(false);
      setForm(emptyForm);
    },
    onError: () => toast.error("Opslaan mislukt"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (credentialId: string) => {
      const res = await fetch(`/api/companies/${companyId}/credentials`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId }),
      });
      if (!res.ok) throw new Error("Verwijderen mislukt");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credentials", companyId] });
      toast.success("Verwijderd");
    },
  });

  function toggleVisible(id: string) {
    setVisibleIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} gekopieerd`);
    setTimeout(() => navigator.clipboard.writeText("").catch(() => {}), 30000);
  }

  // Niet-admins zien dit blok helemaal niet
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Lock className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Alleen beheerders hebben toegang tot wachtwoorden</p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
        <Lock className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Wachtwoorden zijn versleuteld opgeslagen</p>
        <Button onClick={() => setUnlocked(true)} variant="outline" size="sm">
          <Eye className="mr-2 h-4 w-4" />
          Ontgrendelen
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Wachtwoord toevoegen
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}</div>
      ) : credentials.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nog geen wachtwoorden opgeslagen</p>
      ) : (
        <div className="space-y-2">
          {credentials.map((cred) => (
            <div key={cred.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-sm">{cred.label}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => deleteMutation.mutate(cred.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Ticket koppeling */}
              {cred.ticket && (
                <div className="flex items-center gap-1.5">
                  <Ticket className="h-3 w-3 text-primary shrink-0" />
                  <Link href={`/tickets/${cred.ticket.id}`} className="text-xs text-primary hover:underline truncate">
                    #{String(cred.ticket.ticketNumber).padStart(3, "0")} — {cred.ticket.subject}
                  </Link>
                </div>
              )}

              {cred.username && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">Gebruiker</span>
                  <span className="text-xs font-mono flex-1 truncate">{cred.username}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                    onClick={() => copyToClipboard(cred.username!, "Gebruikersnaam")}>
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-20 shrink-0">Wachtwoord</span>
                <span className="text-xs font-mono flex-1 truncate">
                  {visibleIds.has(cred.id) ? cred.password : "••••••••••"}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => toggleVisible(cred.id)}>
                  {visibleIds.has(cred.id) ? <EyeOff className="h-3 w-3 text-muted-foreground" /> : <Eye className="h-3 w-3 text-muted-foreground" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyToClipboard(cred.password, "Wachtwoord")}>
                  <Copy className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>

              {cred.url && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">URL</span>
                  <a href={cred.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 truncate flex-1">
                    {cred.url} <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}

              {cred.notes && (
                <p className="text-xs text-muted-foreground border-t pt-2">{cred.notes}</p>
              )}

              <p className="text-[10px] text-muted-foreground">Door {cred.createdBy.name}</p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Wachtwoord opslaan</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Label *</Label>
              <Input placeholder="bijv. iCloud iPhone Elmar, Windows login PC-01"
                value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} autoFocus />
            </div>

            <div className="space-y-1.5">
              <Label>Koppel aan ticket</Label>
              <TicketSelect
                value={form.ticketId || "none"}
                onValueChange={v => setForm(f => ({ ...f, ticketId: v === "none" ? "" : v }))}
                companyId={companyId}
                placeholder="Zoek ticket van dit bedrijf..."
              />
              <p className="text-[11px] text-muted-foreground">Zo weet je welk wachtwoord bij welk apparaat hoort</p>
            </div>

            <div className="space-y-1.5">
              <Label>Gebruikersnaam / E-mail</Label>
              <Input placeholder="gebruiker@voorbeeld.nl"
                value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>Wachtwoord *</Label>
              <Input placeholder="Wachtwoord"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>URL (optioneel)</Label>
              <Input placeholder="https://appleid.apple.com"
                value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>Notitie (optioneel)</Label>
              <Input placeholder="bijv. herstel-email, beveiligingsvraag..."
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Annuleren</Button>
              <Button type="submit" className="flex-1" disabled={createMutation.isPending || !form.label || !form.password}>
                Opslaan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
