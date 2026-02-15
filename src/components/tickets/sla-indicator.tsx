"use client";

import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SlaStatus = "met" | "breached" | "at-risk" | "active" | "none";

function getSlaStatus(dueDate: Date | null, isMet: boolean | null): SlaStatus {
  if (!dueDate) return "none";
  if (isMet === true) return "met";
  if (isMet === false) return "breached";

  const now = new Date();
  if (now > dueDate) return "breached";

  const remaining = dueDate.getTime() - now.getTime();
  if (remaining < 60 * 60 * 1000) return "at-risk";

  return "active";
}

interface SlaIndicatorProps {
  responseDue: string | null;
  resolveDue: string | null;
  responseMet: boolean | null;
  resolveMet: boolean | null;
}

const statusStyles: Record<SlaStatus, string> = {
  met: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  breached: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "at-risk":
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  active: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  none: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const statusKeys: Record<SlaStatus, string> = {
  met: "met",
  breached: "breached",
  "at-risk": "atRisk",
  active: "active",
  none: "noSla",
};

function SlaMiniBadge({
  label,
  dueDate,
  isMet,
  t,
}: {
  label: string;
  dueDate: string | null;
  isMet: boolean | null;
  t: (key: string) => string;
}) {
  const due = dueDate ? new Date(dueDate) : null;
  const status = getSlaStatus(due, isMet);
  const style = statusStyles[status];

  let text: string;
  if (!due) {
    text = t("noSla");
  } else if (status === "met" || status === "breached" || status === "none") {
    text = t(statusKeys[status]);
  } else {
    text = formatDistanceToNow(due, { addSuffix: true });
  }

  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-medium border-0 px-1.5 py-0.5", style)}
    >
      {label}: {text}
    </Badge>
  );
}

export function SlaIndicator({
  responseDue,
  resolveDue,
  responseMet,
  resolveMet,
}: SlaIndicatorProps) {
  const t = useTranslations("slaStatus");

  // If no SLA dates at all, show a single "No SLA" badge
  if (!responseDue && !resolveDue) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "text-[10px] font-medium border-0 px-1.5 py-0.5",
          statusStyles.none,
        )}
      >
        {t("noSla")}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <SlaMiniBadge
        label={t("response")}
        dueDate={responseDue}
        isMet={responseMet}
        t={t as (key: string) => string}
      />
      <SlaMiniBadge
        label={t("resolve")}
        dueDate={resolveDue}
        isMet={resolveMet}
        t={t as (key: string) => string}
      />
    </div>
  );
}
