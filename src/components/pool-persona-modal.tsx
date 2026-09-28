"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/modal";
import { etiquetaNombreCaso } from "@/lib/nombre-caso";
import { normalizarCorreo } from "@/lib/correo";

export type CasoPoolResumenUi = {
  postulacionId: string;
  nombreCaso: string;
  emprendedorNombre: string;
};

export type PoolPersonaModalItem = {
  evaluadorId: string;
  maxEvaluaciones: number;
  evaluador: { name: string; email: string };
  asignadas: number;
  revisadas: number;
  finalizadas: number;
  casosAsignados: CasoPoolResumenUi[];
  casosObservados: CasoPoolResumenUi[];
  casosFinalizados: CasoPoolResumenUi[];
};

function ListaCasos({
  titulo,
  cantidad,
  casos,
  vacio,
}: {
  titulo: string;
  cantidad: number;
  casos: CasoPoolResumenUi[];
  vacio: string;
}) {
  return (
    <section className="pool-cupo-grupo">
      <h3>
        {titulo} <strong>{cantidad}</strong>
      </h3>
      {casos.length === 0 ? (
        <p className="text-muted">{vacio}</p>
      ) : (
        <ul>
          {casos.map((caso) => (
            <li key={caso.postulacionId}>
              <span className="pool-cupo-caso-nombre">{etiquetaNombreCaso(caso.nombreCaso)}</span>
              <span className="pool-cupo-caso-persona">{caso.emprendedorNombre}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PoolPersonaModal({
  open,
  item,
  convocatoriaId: _convocatoriaId,
  esSupervisor,
  onClose,
  onGuardarCupo,
}: {
  open: boolean;
  item: PoolPersonaModalItem | null;
  convocatoriaId: string;
  esSupervisor: boolean;
  onClose: () => void;
  onGuardarCupo?: (cupo: number, esSupervisor: boolean) => void;
}) {
  const [cupo, setCupo] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setCupo(String(item.maxEvaluaciones));
    setError(null);
    setMensaje(null);
  }, [item]);

  function guardar() {
    if (!item) return;
    const n = Number.parseInt(cupo, 10);
    if (!Number.isFinite(n) || n < 0) {
      setError("El cupo debe ser 0 (sin límite) o un número positivo.");
      return;
    }
    setError(null);
    setMensaje("Cupo actualizado.");
    onGuardarCupo?.(n, esSupervisor);
  }

  const unidad = esSupervisor ? "supervisiones" : "evaluaciones";
  const titulo = item?.evaluador.name ?? (esSupervisor ? "Supervisor" : "Evaluador");

  return (
    <Modal open={open} title={titulo} compact className="modal-cupo" onClose={onClose}>
      {item ? (
        <div className="pool-cupo">
          <p className="pool-cupo-email text-muted">{normalizarCorreo(item.evaluador.email)}</p>

          <label className="pool-cupo-label" htmlFor="cupo-persona">
            Máximo de {unidad} que puede tomar
          </label>
          <div className="pool-cupo-row">
            <input
              className="input"
              id="cupo-persona"
              type="number"
              min={0}
              value={cupo}
              onChange={(event) => setCupo(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void guardar();
                }
              }}
            />
            <button className="btn btn-sm btn-navy" type="button" onClick={() => void guardar()}>
              Guardar
            </button>
          </div>
          <p className="pool-cupo-hint">
            0 = sin límite. Aplica a la asignación manual y a la automática. Las asignaciones ya hechas se mantienen.
          </p>
          {item.maxEvaluaciones > 0 ? (
            <p className="pool-cupo-uso">
              Uso actual: {item.asignadas} de {item.maxEvaluaciones}
            </p>
          ) : (
            <p className="pool-cupo-uso">Uso actual: {item.asignadas} (sin límite)</p>
          )}
          {error ? <p className="text-danger">{error}</p> : null}
          {mensaje ? <p className="font-semibold text-navy">{mensaje}</p> : null}

          <ListaCasos
            titulo="Asignadas"
            cantidad={item.asignadas}
            casos={item.casosAsignados}
            vacio={esSupervisor ? "Sin supervisiones asignadas." : "Sin evaluaciones asignadas."}
          />
          <ListaCasos
            titulo="Observadas"
            cantidad={item.revisadas}
            casos={item.casosObservados}
            vacio="Ningún caso en observaciones."
          />
          <ListaCasos
            titulo="Finalizadas"
            cantidad={item.finalizadas}
            casos={item.casosFinalizados}
            vacio="Ningún caso finalizado."
          />
        </div>
      ) : null}
    </Modal>
  );
}
