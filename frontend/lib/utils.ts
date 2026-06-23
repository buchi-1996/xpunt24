import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatFixtureDateTime = (ts: number) => {
  return new Date(ts * 1000).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export const pickOpposites: Record<string, string> = {
  "over 2.5": "under 2.5",
  "under 2.5": "over 2.5",
  "home": "away",
  "away": "home",
  "draw": "double chance",
  "double chance": "draw",
  "gg": "ng",
  "ng": "gg",
};
