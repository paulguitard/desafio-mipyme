export function historialSupervision(
  items: {
    id: string;
    ronda: number;
    ciclo: number;
    veredicto: string;
    comentario: string;
    createdAt: string;
  }[],
) {
  return items.map((item) => ({
    id: item.id,
    ronda: item.ciclo,
    veredicto: item.veredicto,
    comentario: item.comentario,
    nota: null as number | null,
    createdAt: item.createdAt,
    etiqueta: `Supervisión (ronda ${item.ronda} · ciclo ${item.ciclo})`,
  }));
}
