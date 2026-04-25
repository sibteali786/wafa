import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeRedirect(next: string | null | undefined): string {
  if (!next) return "/home"
  if (!next.startsWith("/")) return "/home"
  if (next.startsWith("//")) return "/home"
  if (/^\/?(javascript|data|vbscript):/i.test(next)) return "/home"
  return next
}
