function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

for (const key of Object.keys(process.env)) {
  const current = process.env[key];
  if (current) {
    process.env[key] = stripWrappingQuotes(current);
  }
}
