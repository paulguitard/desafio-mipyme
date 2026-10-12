/**
 * Cómo actualizar el historial al editar un caso desde administración.
 * Nunca crea una versión nueva: o reescribe la vigente, o solo toca la respuesta.
 */
export type PlanVersionEdicionAdmin =
  | { accion: "omitir" }
  | { accion: "solo_respuesta" }
  | { accion: "reescribir_vigente" };

export function planVersionEdicionAdmin(args: {
  contenidoIgual: boolean;
  cantidadVersiones: number;
}): PlanVersionEdicionAdmin {
  if (args.contenidoIgual) return { accion: "omitir" };
  if (args.cantidadVersiones <= 0) return { accion: "solo_respuesta" };
  return { accion: "reescribir_vigente" };
}
