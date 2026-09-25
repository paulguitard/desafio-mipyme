/** Quita puntos, guiones y cualquier carácter que no sea dígito o K. */
export function limpiarRut(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^0-9K]/g, "");
}

function digitoVerificador(cuerpo: string): string {
  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return "0";
  if (resto === 10) return "K";
  return String(resto);
}

/** Valida RUT chileno (módulo 11). Acepta entrada con o sin formato. */
export function esRutValido(value: string): boolean {
  const limpio = limpiarRut(value);
  if (limpio.length < 2 || limpio.length > 9) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;
  if (!/^[0-9K]$/.test(dv)) return false;
  return digitoVerificador(cuerpo) === dv;
}

/** Formato estándar chileno: 12.345.678-5 */
export function formatearRut(value: string): string {
  const limpio = limpiarRut(value);
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const conPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${conPuntos}-${dv}`;
}

/**
 * Normaliza para persistir: solo cuerpo+DV sin puntos ni guión.
 * Devuelve null si vacío; error si inválido.
 */
export function normalizarRutParaGuardar(
  value: string,
): { ok: true; rut: string | null } | { ok: false; error: string } {
  const limpio = limpiarRut(value);
  if (!limpio) return { ok: true, rut: null };
  if (!esRutValido(limpio)) {
    return { ok: false, error: "El RUT personal no es válido." };
  }
  return { ok: true, rut: limpio };
}
