import { auth } from "@/lib/auth";

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user as {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export async function requireAdmin() {
  const user = await getSessionUser();
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return user;
}
