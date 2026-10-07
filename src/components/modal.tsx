"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

function quitarInerte(node: HTMLElement) {
  if (node.hasAttribute("inert")) node.removeAttribute("inert");
  for (const hijo of node.querySelectorAll("[inert]")) hijo.removeAttribute("inert");
}

function mostrarModal(node: HTMLDialogElement) {
  if (!node.open) node.showModal();
  quitarInerte(node);
}

export function cerrarDialogDesde(target: EventTarget | null) {
  if (!(target instanceof Element)) return;
  const dialog = target.closest("dialog");
  if (!(dialog instanceof HTMLDialogElement) || !dialog.open) return;
  dialog.dataset.cierreIntencional = "1";
  dialog.close();
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
  tall,
  compact,
  toned,
  headerExtra,
  className: extraClassName,
  tourContexto,
  tourAnclaTitulo,
  sinCerrar,
  cierreExplicito,
}: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  tall?: boolean;
  compact?: boolean;
  toned?: boolean;
  headerExtra?: ReactNode;
  className?: string;
  tourContexto?: string;
  tourAnclaTitulo?: string;
  sinCerrar?: boolean;
  /** Solo se cierra con el botón de la acción, no con el fondo ni Escape. */
  cierreExplicito?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const [portalListo, setPortalListo] = useState(false);
  const setDialogRef = useCallback((node: HTMLDialogElement | null) => {
    if (node === null && ref.current?.open) cerrarDialogDesde(ref.current);
    ref.current = node;
  }, []);

  const className = [
    "modal-dialog",
    wide ? "modal-wide" : "",
    tall ? "modal-tall" : "",
    compact ? "modal-compact" : "",
    toned ? "modal-toned" : "",
    extraClassName ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    setPortalListo(true);
  }, []);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) mostrarModal(node);
    if (!open && node.open) cerrarDialogDesde(node);
    if (node.open) quitarInerte(node);
  }, [open, portalListo]);

  useEffect(() => {
    const node = ref.current;
    if (!node || !open) return;
    quitarInerte(node);
    const observer = new MutationObserver(() => quitarInerte(node));
    observer.observe(node, { attributes: true, subtree: true, attributeFilter: ["inert"] });
    return () => observer.disconnect();
  }, [open, portalListo]);

  if (!portalListo) return null;

  return createPortal(
    <dialog
      ref={setDialogRef}
      className={className}
      data-tour-contexto={tourContexto || undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!cierreExplicito) onClose();
      }}
      onClose={(event) => {
        const node = event.currentTarget;
        if (node.dataset.cierreIntencional === "1") {
          delete node.dataset.cierreIntencional;
          return;
        }
        // Si otro dialog provocó un close nativo, reabrimos.
        if (openRef.current) {
          requestAnimationFrame(() => {
            const actual = ref.current;
            if (actual?.isConnected && openRef.current && !actual.open) {
              mostrarModal(actual);
            }
          });
        }
      }}
      onClick={(event) => {
        if (cierreExplicito) return;
        if (event.target === ref.current) onClose();
      }}
    >
      <div
        className="modal-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-chrome">
          <div className="flex items-center justify-between gap-4">
            <h2 className="modal-title text-2xl font-semibold text-navy" data-tour={tourAnclaTitulo}>
              {title}
            </h2>
            {headerExtra || !sinCerrar ? (
            <div className="flex shrink-0 items-center gap-3">
              {headerExtra}
              {sinCerrar ? null : (
              <button
                className="btn btn-sm btn-secondary modal-close-btn"
                type="button"
                aria-label="Cerrar"
                onClick={(event) => {
                  event.stopPropagation();
                  onClose();
                }}
              >
                <span className="modal-close-label">Cerrar</span>
                <span className="modal-close-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </button>
              )}
            </div>
            ) : null}
          </div>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </dialog>,
    document.body,
  );
}
