export function normalizarCorreo(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizarValorCampoCorreo(valor: unknown): unknown {
  if (Array.isArray(valor)) {
    return valor.map((item) => normalizarCorreo(String(item ?? "")));
  }
  if (valor == null) return "";
  return normalizarCorreo(String(valor));
}
