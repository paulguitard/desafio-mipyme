import { stripWrappingQuotes } from "@/lib/env";

export function getAppBaseUrl() {
  const explicit =
    stripWrappingQuotes(process.env.AUTH_URL ?? "") ||
    stripWrappingQuotes(process.env.NEXTAUTH_URL ?? "") ||
    stripWrappingQuotes(process.env.APP_URL ?? "");
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  return "http://localhost:3000";
}
