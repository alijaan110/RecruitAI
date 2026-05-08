import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | undefined | null) {
  if (!dateString) return "—";
  try {
    return format(new Date(dateString), "MMM d, yyyy");
  } catch {
    return "Invalid date";
  }
}

export function formatTimeAgo(dateString: string | undefined | null) {
  if (!dateString) return "—";
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return "Invalid date";
  }
}

export function initials(name: string | undefined | null) {
  if (!name) return "??";
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
}
