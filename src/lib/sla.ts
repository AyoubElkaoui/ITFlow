import { prisma } from "@/lib/prisma";
import { asPriority } from "@/lib/form-utils";

export async function calculateSlaDates(priority: string, createdAt: Date) {
  const policy = await prisma.slaPolicy.findUnique({
    where: { priority: asPriority(priority) },
  });
  if (!policy) return null;

  const responseDue = new Date(
    createdAt.getTime() + policy.responseTimeHours * 60 * 60 * 1000,
  );
  const resolveDue = new Date(
    createdAt.getTime() + policy.resolveTimeHours * 60 * 60 * 1000,
  );

  return { slaResponseDue: responseDue, slaResolveDue: resolveDue };
}

export function getSlaStatus(
  dueDate: Date | null,
  isMet: boolean | null,
): "met" | "breached" | "at-risk" | "active" | "none" {
  if (!dueDate) return "none";
  if (isMet === true) return "met";
  if (isMet === false) return "breached";

  const now = new Date();
  if (now > dueDate) return "breached";

  // At risk if less than 1 hour remaining
  const remaining = dueDate.getTime() - now.getTime();
  if (remaining < 60 * 60 * 1000) return "at-risk";

  return "active";
}
