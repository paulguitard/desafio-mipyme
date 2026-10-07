import { rondaVisibleParticipante } from "@/lib/revision-ciclo";

const ORDINALES_RONDA = [
  "Primera",
  "Segunda",
  "Tercera",
  "Cuarta",
  "Quinta",
  "Sexta",
  "Séptima",
  "Octava",
  "Novena",
  "Décima",
];

const ESTADOS_BORRADOR_REVISION = new Set([
  "PENDIENTE",
  "EN_REVISION",
  "DEVUELTA_SUPERVISOR",
  "REPARADA",
]);

export type AudienciaHilo = "equipo" | "participante";

export type AsignacionHilo = {
  estado: string;
  rondaActual: number;
  cicloSupervision: number;
};

export type RevisionHilo = {
  id: string;
  ronda: number;
  ciclo?: number;
  veredicto: string;
  comentario: string;
  nota?: number | null;
  createdAt?: string | null;
};

export type SupervisionHilo = {
  id: string;
  ronda: number;
  ciclo?: number;
  veredicto: string;
  comentario: string;
  createdAt?: string | null;
};

export type MensajeHilo = {
  id: string;
  rol: "evaluador" | "supervisor";
  ronda: number;
  ciclo: number;
  veredicto: string;
  comentario: string;
  nota: number | null;
  createdAt: string | null;
  esVersionFinal: boolean;
};

export type TarjetaHilo = {
  ronda: number;
  titulo: string;
  mensajes: MensajeHilo[];
};

export function tituloRonda(ronda: number) {
  const ordinal = ORDINALES_RONDA[ronda - 1];
  return ordinal ? `${ordinal} evaluación` : `Evaluación ${ronda}`;
}

export function esBorradorRevision(item: { ronda: number; ciclo?: number }, asignacion: AsignacionHilo) {
  return (
    item.ronda === asignacion.rondaActual &&
    (item.ciclo ?? 1) === asignacion.cicloSupervision &&
    ESTADOS_BORRADOR_REVISION.has(asignacion.estado)
  );
}

export function esBorradorSupervision(
  item: { ronda: number; ciclo?: number },
  asignacion: AsignacionHilo,
) {
  return (
    item.ronda === asignacion.rondaActual &&
    (item.ciclo ?? 1) === asignacion.cicloSupervision &&
    asignacion.estado === "EN_SUPERVISION"
  );
}

function compararMensajes(a: MensajeHilo, b: MensajeHilo) {
  if (b.ciclo !== a.ciclo) return b.ciclo - a.ciclo;
  if (a.rol === b.rol) return 0;
  return a.rol === "supervisor" ? -1 : 1;
}

export function armarHiloRevision(input: {
  revisiones: RevisionHilo[];
  supervisiones?: SupervisionHilo[];
  asignacion: AsignacionHilo;
  audiencia: AudienciaHilo;
}): TarjetaHilo[] {
  const mensajes: MensajeHilo[] = [];

  for (const item of input.revisiones) {
    if (esBorradorRevision(item, input.asignacion)) continue;
    mensajes.push({
      id: item.id,
      rol: "evaluador",
      ronda: item.ronda,
      ciclo: item.ciclo ?? 1,
      veredicto: item.veredicto,
      comentario: item.comentario,
      nota: item.nota ?? null,
      createdAt: item.createdAt ?? null,
      esVersionFinal: false,
    });
  }

  if (input.audiencia === "equipo") {
    for (const item of input.supervisiones ?? []) {
      if (esBorradorSupervision(item, input.asignacion)) continue;
      mensajes.push({
        id: item.id,
        rol: "supervisor",
        ronda: item.ronda,
        ciclo: item.ciclo ?? 1,
        veredicto: item.veredicto,
        comentario: item.comentario,
        nota: null,
        createdAt: item.createdAt ?? null,
        esVersionFinal: false,
      });
    }
  }

  const porRonda = new Map<number, MensajeHilo[]>();
  for (const mensaje of mensajes) {
    const lista = porRonda.get(mensaje.ronda) ?? [];
    lista.push(mensaje);
    porRonda.set(mensaje.ronda, lista);
  }

  if (input.audiencia === "equipo" && !porRonda.has(input.asignacion.rondaActual)) {
    porRonda.set(input.asignacion.rondaActual, []);
  }

  return [...porRonda.keys()]
    .sort((a, b) => b - a)
    .flatMap((ronda) => {
      const deRonda = (porRonda.get(ronda) ?? []).slice().sort(compararMensajes);
      const liberada = rondaVisibleParticipante(ronda, input.asignacion);

      if (input.audiencia === "participante") {
        if (!liberada) return [];
        const ultima = deRonda.find((item) => item.rol === "evaluador");
        if (!ultima) return [];
        return [{ ronda, titulo: tituloRonda(ronda), mensajes: [{ ...ultima, esVersionFinal: false }] }];
      }

      if (liberada) {
        const ultima = deRonda.find((item) => item.rol === "evaluador");
        if (ultima) ultima.esVersionFinal = true;
      }

      return [{ ronda, titulo: tituloRonda(ronda), mensajes: deRonda }];
    });
}
