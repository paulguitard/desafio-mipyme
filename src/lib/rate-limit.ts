type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Rate limit en memoria del proceso (suficiente para un solo instance).
 * Devuelve true si la clave aún puede actuar; false si está bloqueada.
 */
export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count += 1;
  return true;
}
