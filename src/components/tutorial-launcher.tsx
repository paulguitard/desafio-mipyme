"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import type { Role } from "@/lib/roles";
import { resolverTutorial, selectorTour, type PasoTutorial } from "@/lib/tutoriales";

function dialogAbiertoMasAlto() {
  const dialogs = document.querySelectorAll("dialog[open]");
  return dialogs.length > 0 ? dialogs[dialogs.length - 1] : null;
}

function dialogTutorialAbierto() {
  const dialogs = document.querySelectorAll("dialog[open][data-tour-contexto]");
  return dialogs.length > 0 ? dialogs[dialogs.length - 1] : null;
}

function pasosPresentes(pasos: PasoTutorial[], raiz: ParentNode) {
  return pasos.filter((paso) => raiz.querySelector(selectorTour(paso.ancla)));
}

function anclarCapaTourAlDialog(dialog: Element) {
  for (const nodo of [...document.body.children]) {
    if (!(nodo instanceof Element) || nodo === dialog) continue;
    const esCapa =
      nodo.id === "driver-dummy-element" ||
      [...nodo.classList].some((clase) => clase.startsWith("driver-"));
    if (esCapa) dialog.appendChild(nodo);
  }
}

export function TutorialLauncher({ rol }: { rol: Role }) {
  const pathname = usePathname();
  const recorriendo = useRef<ReturnType<typeof driver> | null>(null);
  const [activo, setActivo] = useState(false);
  const [destino, setDestino] = useState<Element | null>(null);

  useEffect(() => {
    return () => {
      recorriendo.current?.destroy();
      recorriendo.current = null;
    };
  }, [pathname]);

  useEffect(() => {
    function sincronizarDestino() {
      setDestino(dialogAbiertoMasAlto() ?? document.body);
    }

    sincronizarDestino();

    const observer = new MutationObserver((mutations) => {
      const dialogCambio = mutations.some((mutation) => {
        if (mutation.type === "attributes" && mutation.target instanceof HTMLDialogElement) {
          return true;
        }
        if (mutation.type === "childList") {
          for (const nodo of [...mutation.addedNodes, ...mutation.removedNodes]) {
            if (nodo instanceof HTMLDialogElement) return true;
          }
        }
        return false;
      });
      if (dialogCambio) sincronizarDestino();
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["open"],
    });

    document.addEventListener("close", sincronizarDestino, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("close", sincronizarDestino, true);
    };
  }, []);

  function iniciar() {
    recorriendo.current?.destroy();
    const dialog = dialogTutorialAbierto() ?? dialogAbiertoMasAlto();
    const raiz: ParentNode = dialog ?? document;
    const contexto = dialog?.getAttribute("data-tour-contexto");
    const pasos = pasosPresentes(resolverTutorial(rol, pathname, contexto), raiz);
    if (pasos.length === 0) return;

    const instancia = driver({
      overlayColor: "#061536",
      overlayOpacity: 0.62,
      stagePadding: 8,
      stageRadius: 10,
      popoverOffset: 12,
      popoverClass: "tutorial-popover",
      showProgress: true,
      progressText: "{{current}} de {{total}}",
      nextBtnText: "Siguiente",
      prevBtnText: "Anterior",
      doneBtnText: "Cerrar",
      allowClose: true,
      disableActiveInteraction: true,
      skipMissingElement: true,
      smoothScroll: true,
      onDestroyed: () => {
        recorriendo.current = null;
        setActivo(false);
      },
      onHighlighted: (element) => {
        if (dialog) anclarCapaTourAlDialog(dialog);
        if (element instanceof HTMLElement) {
          element.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
        }
      },
      steps: pasos.map((paso) => ({
        element: () => raiz.querySelector(selectorTour(paso.ancla)) as Element,
        popover: {
          title: paso.titulo,
          description: paso.descripcion,
          side: "bottom",
          align: "end",
        },
      })),
    });

    recorriendo.current = instancia;
    setActivo(true);
    try {
      instancia.drive();
      if (dialog) {
        requestAnimationFrame(() => anclarCapaTourAlDialog(dialog));
      }
    } catch {
      recorriendo.current = null;
      setActivo(false);
    }
  }

  if (!destino) return null;

  return createPortal(
    <button
      type="button"
      className="tutorial-launcher"
      aria-label="Abrir tutorial de esta pantalla"
      title="Tutorial de esta pantalla"
      aria-pressed={activo}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        iniciar();
      }}
    >
      ?
    </button>,
    destino,
  );
}
