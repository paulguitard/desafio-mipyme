export function stripWrappingQuotes(value: string) {
  let next = value.trim();
  for (let i = 0; i < 3; i++) {
    if (next.length < 2) break;
    const first = next[0];
    const last = next[next.length - 1];
    const wrapped =
      (first === '"' && last === '"') ||
      (first === "'" && last === "'") ||
      (first === "“" && last === "”") ||
      (first === "‘" && last === "’");
    if (!wrapped) break;
    next = next.slice(1, -1).trim();
  }
  return next;
}

function sanitizeProcessEnv() {
  for (const key of Object.keys(process.env)) {
    const current = process.env[key];
    if (current) {
      process.env[key] = stripWrappingQuotes(current);
    }
  }
}

sanitizeProcessEnv();
