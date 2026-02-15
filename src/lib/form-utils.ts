import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldValues, Resolver } from "react-hook-form";
import type { ZodType } from "zod/v4";
import type { Priority } from "@/generated/prisma/enums";

/**
 * Typed zodResolver wrapper compatible with Zod v4 + react-hook-form v7.
 * Eliminates the need for `as any` casts on every useForm call.
 */
export function typedResolver<T extends FieldValues>(
  schema: ZodType<T>,
): Resolver<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return zodResolver(schema as any) as Resolver<T>;
}

/** Cast a validated priority string to the Prisma Priority type */
export function asPriority(val: string): Priority {
  return val as Priority;
}
