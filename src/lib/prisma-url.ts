/** En `next dev`, un `connection_limit=1` deja el login sin cupo si hay una query lenta. */
export function ajustarUrlPrisma(url: string, nodeEnv = process.env.NODE_ENV) {
  if (!url || nodeEnv === "production") return url;
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.get("connection_limit") === "1") {
      parsed.searchParams.set("connection_limit", "5");
    }
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", "20");
    }
    if (!parsed.searchParams.has("connect_timeout")) {
      parsed.searchParams.set("connect_timeout", "10");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}
