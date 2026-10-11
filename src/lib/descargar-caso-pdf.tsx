"use client";

import { createRoot } from "react-dom/client";
import { CasoPdfDocumento } from "@/components/caso-pdf-documento";
import type { DetalleFichaAdmin } from "@/lib/convocatoria-admin-data";
import { generarYDescargarCasoPdf } from "@/lib/caso-pdf";

function esperarFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function esperarImagenes(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            }),
    ),
  );
}

async function esperarFuenteYLayout(root: HTMLElement) {
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }
  await esperarImagenes(root);
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const pendiente = root.querySelector("[data-loading], .gantt-wrap:empty");
    if (!pendiente && root.querySelectorAll("[data-caso-pdf-tarjeta]").length > 0) break;
    await new Promise((resolve) => window.setTimeout(resolve, 80));
  }
  await new Promise((resolve) => window.setTimeout(resolve, 200));
  await esperarFrame();
  await esperarImagenes(root);
  await esperarFrame();
}

/** Descarga directa del PDF (sin diálogo de impresión). */
export async function descargarCasoPdfDesdeDetalle(data: DetalleFichaAdmin) {
  const host = document.createElement("div");
  host.className = "caso-pdf-host font-sans";
  document.body.appendChild(host);

  const root = createRoot(host);
  const holder = { current: null as HTMLDivElement | null };

  try {
    await new Promise<void>((resolve) => {
      root.render(<CasoPdfDocumento data={data} rootRef={holder} />);
      void esperarFrame().then(resolve);
    });

    const el = holder.current ?? host.querySelector<HTMLElement>(".caso-pdf-documento");
    if (!el) throw new Error("No se pudo armar el documento del caso.");

    await esperarFuenteYLayout(el);
    await generarYDescargarCasoPdf(el, data);
  } finally {
    root.unmount();
    host.remove();
  }
}
