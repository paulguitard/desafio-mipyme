export function cupoAlcanzado(max: number, carga: number) {
  return max > 0 && carga >= max;
}

export function esEvaluacionObservada(estado: string) {
  return (
    estado === "CON_OBSERVACIONES" ||
    estado === "REPARADA" ||
    estado === "DEVUELTA_SUPERVISOR"
  );
}

export function mensajeCupoPersona(rol: "evaluador" | "supervisor", max: number, nombre?: string) {
  const quien = nombre?.trim() || (rol === "supervisor" ? "Este supervisor" : "Este evaluador");
  const unidad = rol === "supervisor" ? "supervisión" : "evaluación";
  const unidades = rol === "supervisor" ? "supervisiones" : "evaluaciones";
  return `${quien} ya alcanzó su máximo de ${max} ${max === 1 ? unidad : unidades}.`;
}
