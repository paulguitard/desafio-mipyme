"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { guardarCasoAdmin } from "@/actions/postulaciones";
import { IndicadorGuardando } from "@/components/indicador-guardando";
import { ModalGuardado, type EstadoModalProgreso } from "@/components/modal-guardado";
import { MAX_FILE_BYTES, MAX_IMAGE_INPUT_BYTES } from "@/lib/storage/limits";
import { useAccionOptimista } from "@/lib/use-dato-optimista";

function validarAdjuntosCliente(formData: FormData): string | null {
  for (const [key, value] of formData.entries()) {
    if (!(value instanceof File) || value.size <= 0) continue;
    if (key.startsWith("archivo-") && value.size > MAX_FILE_BYTES) {
      return `El archivo "${value.name}" supera el máximo de 2 MB.`;
    }
    if (key.startsWith("imagen-") && value.size > MAX_IMAGE_INPUT_BYTES) {
      return `La imagen "${value.name}" supera el máximo de 10 MB.`;
    }
  }
  return null;
}

function limpiarInputsArchivo(form: HTMLFormElement | null) {
  if (!form) return;
  for (const input of form.querySelectorAll<HTMLInputElement>('input[type="file"]')) {
    input.value = "";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

export function FormularioCasoAdmin({
  postulacionId,
  back,
  title,
  children,
}: {
  postulacionId: string;
  back: React.ReactNode;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [guardadoModal, setGuardadoModal] = useState<EstadoModalProgreso | null>(null);
  const accion = useAccionOptimista();
  const savingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  function guardar() {
    if (savingRef.current) return;
    savingRef.current = true;
    setError(null);
    setGuardadoModal("enCurso");
    const formData = formRef.current ? new FormData(formRef.current) : null;
    if (!formData) {
      savingRef.current = false;
      setGuardadoModal("error");
      setError("No se pudo guardar.");
      return;
    }
    const adjuntoError = validarAdjuntosCliente(formData);
    if (adjuntoError) {
      savingRef.current = false;
      setGuardadoModal("error");
      setError(adjuntoError);
      return;
    }
    void accion.ejecutar(() => guardarCasoAdmin(formData), {
      onOk: () => {
        limpiarInputsArchivo(formRef.current);
        savingRef.current = false;
        setGuardadoModal("exito");
        router.refresh();
      },
      onError: (mensajeError) => {
        savingRef.current = false;
        setGuardadoModal("error");
        setError(mensajeError);
      },
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={(event) => event.preventDefault()}
      className="page-workspace is-formulario-caso mx-auto grid h-full min-h-0 w-full max-w-4xl grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden has-acciones-caso"
      aria-busy={accion.guardando}
    >
      <div className="shrink-0 space-y-3 bg-background">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span data-tour="volver">{back}</span>
            <div className="min-w-0 flex-1">{title}</div>
          </div>
          <div className="formulario-caso-acciones flex shrink-0 flex-wrap justify-end gap-2">
            <button
              className="btn btn-sm btn-primary"
              type="button"
              disabled={Boolean(guardadoModal) || accion.guardando}
              onClick={guardar}
            >
              Guardar
            </button>
          </div>
        </div>
        {error && guardadoModal !== "error" ? <p className="text-danger">{error}</p> : null}
        <IndicadorGuardando visible={accion.guardando && !guardadoModal} />
      </div>
      <div className="page-scroll min-h-0 overflow-y-auto overscroll-contain space-y-6 pr-1">
        <div className="flex flex-col gap-6">
          <input type="hidden" name="postulacionId" value={postulacionId} />
          {children}
        </div>
      </div>
      <ModalGuardado
        open={guardadoModal !== null}
        estado={guardadoModal ?? "enCurso"}
        error={error}
        onAceptar={() => {
          setGuardadoModal(null);
          if (guardadoModal === "error") setError(null);
        }}
      />
    </form>
  );
}
