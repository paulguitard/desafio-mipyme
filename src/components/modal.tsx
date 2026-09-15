"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
  tall,
  toned,
  headerExtra,
}: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  tall?: boolean;
  toned?: boolean;
  headerExtra?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  const className = [
    "modal-dialog",
    wide ? "modal-wide" : "",
    tall ? "modal-tall" : "",
    toned ? "modal-toned" : "",
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={className}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        // Si otro dialog anidado provocó un close nativo, reabrimos.
        if (openRef.current) {
          requestAnimationFrame(() => {
            const node = ref.current;
            if (node && openRef.current && !node.open) node.showModal();
          });
        }
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="modal-panel">
        <div className="modal-chrome">
          <div className="flex items-center justify-between gap-4">
            <h2 className="modal-title text-2xl font-semibold text-navy">{title}</h2>
            <div className="flex shrink-0 items-center gap-3">
              {headerExtra}
              <button
                className="btn btn-sm btn-secondary"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onClose();
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </dialog>
  );
}
