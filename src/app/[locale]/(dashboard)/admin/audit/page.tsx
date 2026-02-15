"use client";

import { useTranslations } from "next-intl";

import { useState, useEffect } from "react";
import { useAuditLogs } from "@/hooks/use-audit";
import { format, formatDistanceToNow } from "date-fns";
import { Shield, ChevronDown, ChevronRight } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  userId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface AuditResponse {
  data: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

const actionBadgeConfig: Record<string, string> = {
  CREATE: "bg-green-500/15 text-green-400 border-green-500/30",
  UPDATE: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  DELETE: "bg-red-500/15 text-red-400 border-red-500/30",
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ChangesCell({
  changes,
}: {
  changes: Record<string, { old: unknown; new: unknown }> | null;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!changes || Object.keys(changes).length === 0) {
    return <span className="text-muted-foreground">&mdash;</span>;
  }

  const fields = Object.entries(changes);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {fields.length} field{fields.length !== 1 ? "s" : ""} changed
      </button>
      {expanded && (
        <div className="mt-2 rounded-md border bg-muted/50 p-2 text-xs space-y-1">
          {fields.map(([field, change]) => (
            <div key={field} className="flex items-start gap-1 flex-wrap">
              <span className="font-medium">{field}:</span>
              <span className="text-red-400 line-through break-all">
                {formatValue(change.old)}
              </span>
              <span className="text-muted-foreground">&rarr;</span>
              <span className="text-green-400 break-all">
                {formatValue(change.new)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AuditPage() {
  const t = useTranslations("admin.audit");
  const tc = useTranslations("common");
  const [entityType, setEntityType] = useState("all");
  const [action, setAction] = useState("all");
  const [userId, setUserId] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<UserOption[]>([]);

  // Load users for the filter dropdown
  useEffect(() => {
    fetch("/api/users")
      .then((res) => {
        if (res.ok) return res.json();
        return [];
      })
      .then((data) => {
        // Handle both paginated and array responses
        const list = Array.isArray(data) ? data : data?.data || [];
        setUsers(list);
      })
      .catch(() => setUsers([]));
  }, []);

  const { data, isLoading } = useAuditLogs({
    entityType: entityType !== "all" ? entityType : undefined,
    action: action !== "all" ? action : undefined,
    userId: userId !== "all" ? userId : undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const response = data as AuditResponse | undefined;
  const logs = response?.data || [];
  const total = response?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end gap-4">
            {/* Entity Type filter */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Entity Type
              </Label>
              <Select
                value={entityType}
                onValueChange={(v) => {
                  setEntityType(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Entity Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="Ticket">Ticket</SelectItem>
                  <SelectItem value="Company">Company</SelectItem>
                  <SelectItem value="Contact">Contact</SelectItem>
                  <SelectItem value="Asset">Asset</SelectItem>
                  <SelectItem value="TimeEntry">TimeEntry</SelectItem>
                  <SelectItem value="User">User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action filter */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Action</Label>
              <Select
                value={action}
                onValueChange={(v) => {
                  setAction(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User filter */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">User</Label>
              <Select
                value={userId}
                onValueChange={(v) => {
                  setUserId(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="User" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date from */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="w-[160px]"
              />
            </div>

            {/* Date to */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="w-[160px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t("noLogs")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {entityType !== "all" ||
                action !== "all" ||
                userId !== "all" ||
                fromDate ||
                toDate
                  ? t("adjustFilters")
                  : t("logsAppear")}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("datetime")}</TableHead>
                    <TableHead>{t("user")}</TableHead>
                    <TableHead>{t("action")}</TableHead>
                    <TableHead>{t("entityType")}</TableHead>
                    <TableHead>{t("entityId")}</TableHead>
                    <TableHead>{t("changes")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm">
                          {format(new Date(log.createdAt), "dd MMM yyyy HH:mm")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.createdAt), {
                            addSuffix: true,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {log.user.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {log.user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-medium",
                            actionBadgeConfig[log.action] || "",
                          )}
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.entityType}
                      </TableCell>
                      <TableCell
                        className="text-sm font-mono text-muted-foreground max-w-[120px] truncate"
                        title={log.entityId}
                      >
                        {log.entityId.length > 12
                          ? log.entityId.slice(0, 12) + "..."
                          : log.entityId}
                      </TableCell>
                      <TableCell>
                        <ChangesCell
                          changes={
                            log.changes as Record<
                              string,
                              { old: unknown; new: unknown }
                            > | null
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} ({total} total entries)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
