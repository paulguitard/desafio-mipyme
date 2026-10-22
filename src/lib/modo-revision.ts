import { esMentoriaContenido } from "@/lib/tipo-formulario";

export type ModoRevision = "ambos" | "solo_evaluadores" | "solo_supervisores" | "ninguno";

export type FlagsRevision = {
  evaluadoresHabilitados: boolean;
  supervisoresHabilitados: boolean;
};

export function parseFlagRevision(raw: FormDataEntryValue | null | undefined, fallback = true): boolean {
  if (raw == null) return fallback;
  const value = String(raw).trim().toLowerCase();
  if (value === "false" || value === "0" || value === "off" || value === "") return false;
  return value === "true" || value === "1" || value === "on" || value === "yes";
}

export function flagsRevisionDesdeForm(
  formData: FormData,
  fallback: FlagsRevision = { evaluadoresHabilitados: true, supervisoresHabilitados: true },
): FlagsRevision {
  const tieneEvaluadores = formData.has("evaluadoresHabilitados");
  const tieneSupervisores = formData.has("supervisoresHabilitados");
  return {
    evaluadoresHabilitados: tieneEvaluadores
      ? parseFlagRevision(formData.get("evaluadoresHabilitados"), true)
      : fallback.evaluadoresHabilitados,
    supervisoresHabilitados: tieneSupervisores
      ? parseFlagRevision(formData.get("supervisoresHabilitados"), true)
      : fallback.supervisoresHabilitados,
  };
}

/** Checkbox HTML: si no viene en FormData, está desmarcado. */
export function flagsRevisionDesdeCheckboxes(
  formData: FormData,
  opciones?: { requerirCampos?: boolean },
): FlagsRevision | null {
  const tieneEvaluadores = formData.has("evaluadoresHabilitados");
  const tieneSupervisores = formData.has("supervisoresHabilitados");
  if (opciones?.requerirCampos && !tieneEvaluadores && !tieneSupervisores) {
    return null;
  }
  return {
    evaluadoresHabilitados: tieneEvaluadores,
    supervisoresHabilitados: tieneSupervisores,
  };
}

export function modoRevision(flags: FlagsRevision): ModoRevision {
  if (flags.evaluadoresHabilitados && flags.supervisoresHabilitados) return "ambos";
  if (flags.evaluadoresHabilitados) return "solo_evaluadores";
  if (flags.supervisoresHabilitados) return "solo_supervisores";
  return "ninguno";
}

export function modoRevisionDeConvocatoria(convocatoria: {
  tipo?: string | null;
  evaluadoresHabilitados?: boolean | null;
  supervisoresHabilitados?: boolean | null;
}): ModoRevision {
  if (esMentoriaContenido(convocatoria.tipo)) return "ninguno";
  return modoRevision({
    evaluadoresHabilitados: convocatoria.evaluadoresHabilitados !== false,
    supervisoresHabilitados: convocatoria.supervisoresHabilitados !== false,
  });
}

export function usaEvaluadores(modo: ModoRevision): boolean {
  return modo === "ambos" || modo === "solo_evaluadores";
}

export function usaSupervisores(modo: ModoRevision): boolean {
  return modo === "ambos" || modo === "solo_supervisores";
}

export function publicaDirectoAlParticipante(modo: ModoRevision): boolean {
  return modo === "solo_evaluadores" || modo === "solo_supervisores";
}

/** Estado de AsignacionEvaluador tras Pedir cambios o Finalizar. */
export function estadoTrasPublicarEvaluacion(
  modo: ModoRevision,
  intencion: "OBSERVACIONES" | "FINALIZAR",
): "EN_SUPERVISION" | "CON_OBSERVACIONES" | "FINALIZADA" {
  if (!publicaDirectoAlParticipante(modo)) return "EN_SUPERVISION";
  return intencion === "FINALIZAR" ? "FINALIZADA" : "CON_OBSERVACIONES";
}

export function supervisorActuaComoEvaluador(modo: ModoRevision): boolean {
  return modo === "solo_supervisores";
}

/** Borrador del formulario de evaluación. El supervisor entra cuando no hay evaluadores. */
export function puedeGuardarBorradorEvaluacion(rol: string, modo: ModoRevision): boolean {
  if (rol === "EVALUADOR") return usaEvaluadores(modo);
  if (rol === "SUPERVISOR") return supervisorActuaComoEvaluador(modo);
  return false;
}

export function mensajeFlagsRevisionInvalidos(flags: FlagsRevision): string | null {
  if (modoRevision(flags) === "ninguno") {
    return "Debes habilitar al menos evaluadores o supervisores.";
  }
  return null;
}

export type ConteoAsignacionesRevision = {
  asignacionesEvaluador: number;
  asignacionesSupervisor: number;
};

export function validarCambioRoles(args: {
  actual: FlagsRevision;
  siguiente: FlagsRevision;
  conteos: ConteoAsignacionesRevision;
}): { ok: true } | { ok: false; error: string } {
  const invalido = mensajeFlagsRevisionInvalidos(args.siguiente);
  if (invalido) return { ok: false, error: invalido };

  const mismo =
    args.actual.evaluadoresHabilitados === args.siguiente.evaluadoresHabilitados &&
    args.actual.supervisoresHabilitados === args.siguiente.supervisoresHabilitados;
  if (mismo) return { ok: true };

  const { asignacionesEvaluador, asignacionesSupervisor } = args.conteos;
  if (asignacionesEvaluador === 0 && asignacionesSupervisor === 0) return { ok: true };

  const partes: string[] = [];
  if (asignacionesEvaluador > 0) {
    partes.push(
      asignacionesEvaluador === 1
        ? "1 asignación de evaluador"
        : `${asignacionesEvaluador} asignaciones de evaluador`,
    );
  }
  if (asignacionesSupervisor > 0) {
    partes.push(
      asignacionesSupervisor === 1
        ? "1 asignación de supervisor"
        : `${asignacionesSupervisor} asignaciones de supervisor`,
    );
  }
  return {
    ok: false,
    error: `No se pueden cambiar los roles mientras haya personas asignadas a casos. Quita primero: ${partes.join(" y ")}.`,
  };
}
