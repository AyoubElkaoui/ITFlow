import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Telefoonnummers zijn tekst, geen getallen. Bij imports zijn sommige als getal
 * geparsed waardoor er een ".0" achter is gekomen (bv. "31683787920.0").
 * Strip die decimale staart zodat we altijd een net nummer tonen.
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return ""
  return phone.trim().replace(/\.0+$/, "")
}
