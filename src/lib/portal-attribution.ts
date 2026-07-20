import { prisma } from "@/lib/prisma";

// Portal-gegenereerde records (tickets/notities die door klanten worden gemaakt)
// moeten technisch aan een staff-User hangen (verplichte FK). Ze mogen echter
// géén willekeurige admin als "eigenaar" tonen — dat leverde verwarrend "Hassan
// Arbaj" op. We kiezen daarom bij voorkeur de behandelaar of aanmaker van het
// ticket, en anders de oudste actieve admin (de hoofdgebruiker van ITFlow).
export async function resolveStaffOwnerId(prefer?: {
  assignedToId?: string | null;
  createdById?: string | null;
}): Promise<string | null> {
  if (prefer?.assignedToId) return prefer.assignedToId;
  if (prefer?.createdById) return prefer.createdById;
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return admin?.id ?? null;
}
