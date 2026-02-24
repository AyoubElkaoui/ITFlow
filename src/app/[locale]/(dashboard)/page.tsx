"use client";

import { useTranslations } from "next-intl";

import { useDashboard } from "@/hooks/use-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, PriorityBadge } from "@/components/shared/status-badge";
import {
  Ticket,
  Clock,
  AlertCircle,
  Plus,
  ArrowRight,
  Monitor,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatDistanceToNow, format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboard();
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-10 w-10 text-destructive mb-3" />
            <p className="text-sm text-muted-foreground">{t("failedToLoad")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-8 bg-muted rounded w-16" />
                <div className="h-4 bg-muted rounded w-24 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const recentTickets = data?.recentTickets || [];
  const hoursBreakdown = data?.hoursBreakdown?.month || [];
  const ticketsByStatus: Record<string, number> = data?.ticketsByStatus || {};
  const recentActivity: Array<{
    id: string;
    companyShortName: string;
    hours: number;
    description: string | null;
    date: string;
    billable: boolean;
  }> = data?.recentActivity || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex gap-2">
          <Link href="/tickets/new">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t("newTicket")}
            </Button>
          </Link>
          <Link href="/time">
            <Button size="sm" variant="outline">
              <Clock className="mr-2 h-4 w-4" />
              {t("logHours")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("openTickets")}
            </CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.openTickets || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("hoursThisWeek")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.hoursThisWeek?.toFixed(2) || "0.00"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("hoursThisMonth")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.hoursThisMonth?.toFixed(2) || "0.00"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("totalAssets")}
            </CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalAssets || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Tickets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("recentTickets")}</CardTitle>
            <Link href="/tickets">
              <Button variant="ghost" size="sm">
                {t("viewAll")} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("noTickets")}
              </p>
            ) : (
              <div className="space-y-3">
                {recentTickets.map(
                  (ticket: {
                    id: string;
                    ticketNumber: number;
                    subject: string;
                    status: string;
                    priority: string;
                    createdAt: string;
                    company: { shortName: string };
                  }) => (
                    <Link
                      key={ticket.id}
                      href={`/tickets/${ticket.id}`}
                      className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-mono">
                            #{String(ticket.ticketNumber).padStart(3, "0")}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground">
                            {ticket.company.shortName}
                          </span>
                        </div>
                        <p className="text-sm font-medium truncate">
                          {ticket.subject}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <PriorityBadge priority={ticket.priority} />
                        <StatusBadge status={ticket.status} />
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(ticket.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </Link>
                  ),
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hours per Company Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t("hoursChart")}</CardTitle>
          </CardHeader>
          <CardContent>
            {hoursBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("noHoursLogged")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hoursBreakdown}>
                  <XAxis
                    dataKey="companyShortName"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}h`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => {
                      const v = Number(value);
                      return [`${v}h`, tc("hours")];
                    }}
                  />
                  <Bar
                    dataKey="hours"
                    name={tc("hours")}
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tickets by Status + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tickets by Status */}
        <Card>
          <CardHeader>
            <CardTitle>{t("ticketsByStatus")}</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(ticketsByStatus).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("noTickets")}
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(ticketsByStatus).map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <StatusBadge status={status} />
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("recentActivity")}</CardTitle>
            <Link href="/time">
              <Button variant="ghost" size="sm">
                {t("viewAll")} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("noRecentActivity")}
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {entry.companyShortName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.date), "dd/MM/yyyy")}
                        </span>
                      </div>
                      <p className="text-sm truncate">
                        {entry.description || "-"}
                      </p>
                    </div>
                    <span className="text-sm font-medium shrink-0">
                      {entry.hours.toFixed(2)}h
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
