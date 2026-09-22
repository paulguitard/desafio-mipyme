export function getAppBaseUrl() {
  const explicit =
    process.env.AUTH_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  return "http://localhost:3000";
}
