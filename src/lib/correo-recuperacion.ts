import { parseImagenConvocatoria } from "@/lib/convocatoria";
import { publicUploadUrl, type StoredFile } from "@/lib/preguntas";

export type ConfigCorreoRecuperacionData = {
  asunto: string;
  titulo: string;
  cuerpo: string;
  textoBoton: string;
  pie: string;
  colorFondo: string;
  colorEncabezado: string;
  colorBoton: string;
  colorTexto: string;
  imagen: string;
  imagenUrl: string | null;
};

/** Convierte voseo argentino de las plantillas a tuteo castellano. */
export function destosearTextoCorreo(texto: string): string {
  return texto
    .replaceAll("copiá y pegá", "copia y pega")
    .replaceAll("copiá", "copia")
    .replaceAll("pegá", "pega")
    .replaceAll("Entrá", "Entra")
    .replaceAll("podés", "puedes")
    .replaceAll("Revisá", "Revisa")
    .replaceAll("revisá", "revisa")
    .replaceAll("Volvé", "Vuelve")
    .replaceAll("volvé", "vuelve")
    .replaceAll("Ignorá", "Ignora")
    .replaceAll("ignorá", "ignora");
}

export const DEFAULT_CORREO_RECUPERACION: Omit<ConfigCorreoRecuperacionData, "imagenUrl"> = {
  asunto: "Restablecer contraseña — Desafío AIEP",
  titulo: "Restablecer contraseña",
  cuerpo:
    "Hola {{nombre}},\n\nRecibimos un pedido para restablecer tu contraseña en Desafío AIEP. El enlace vence en 1 hora. Si no pediste este cambio, ignora este correo.",
  textoBoton: "Elegir nueva contraseña",
  pie: "Si el botón no funciona, copia y pega este enlace en tu navegador:\n{{enlace}}",
  colorFondo: "#f4f6fa",
  colorEncabezado: "#0a2156",
  colorBoton: "#c8102e",
  colorTexto: "#12203a",
  imagen: "",
};

export function imagenUrlFromStored(raw: string): string | null {
  const file = parseImagenConvocatoria(raw);
  return file ? publicUploadUrl(file) : null;
}

export function toConfigCorreoView(
  row: Omit<ConfigCorreoRecuperacionData, "imagenUrl"> | null | undefined,
): ConfigCorreoRecuperacionData {
  const base = row ?? DEFAULT_CORREO_RECUPERACION;
  return {
    ...base,
    asunto: destosearTextoCorreo(base.asunto),
    titulo: destosearTextoCorreo(base.titulo),
    cuerpo: destosearTextoCorreo(base.cuerpo),
    textoBoton: destosearTextoCorreo(base.textoBoton),
    pie: destosearTextoCorreo(base.pie),
    imagenUrl: imagenUrlFromStored(base.imagen),
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type CorreoPlaceholders = Record<string, string>;

export function applyPlaceholders(template: string, vars: CorreoPlaceholders) {
  return template.replaceAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => vars[key] ?? "");
}

function paragraphsToHtml(text: string) {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  if (blocks.length === 0) return "";
  return blocks
    .map((block) => {
      const withBreaks = escapeHtml(block).replaceAll("\n", "<br />");
      return `<p style="margin:0 0 1rem;line-height:1.55;">${withBreaks}</p>`;
    })
    .join("");
}

export function renderCorreoRecuperacion(
  config: Omit<ConfigCorreoRecuperacionData, "imagenUrl">,
  vars: CorreoPlaceholders,
  imagenUrl = imagenUrlFromStored(config.imagen),
): { subject: string; html: string; text: string } {
  const enlace = vars.enlace ?? "";
  const subject = applyPlaceholders(config.asunto, vars);
  const titulo = applyPlaceholders(config.titulo, vars);
  const cuerpo = applyPlaceholders(config.cuerpo, vars);
  const textoBoton = applyPlaceholders(config.textoBoton, vars);
  const pie = applyPlaceholders(config.pie, vars);

  const html = `
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:${escapeHtml(config.colorFondo)};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${escapeHtml(config.colorFondo)};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dce3ee;">
          ${
            imagenUrl
              ? `<tr><td style="padding:0;line-height:0;"><img src="${escapeHtml(imagenUrl)}" alt="" width="560" style="display:block;width:100%;max-width:560px;height:auto;" /></td></tr>`
              : ""
          }
          <tr>
            <td style="background:${escapeHtml(config.colorEncabezado)};color:#ffffff;padding:20px 28px;">
              <h1 style="margin:0;font-size:22px;line-height:1.3;font-family:Segoe UI,Arial,sans-serif;">${escapeHtml(titulo)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;color:${escapeHtml(config.colorTexto)};font-family:Segoe UI,Arial,sans-serif;font-size:16px;">
              ${paragraphsToHtml(cuerpo)}
              <p style="margin:0 0 1.5rem;">
                <a href="${escapeHtml(enlace)}" style="display:inline-block;background:${escapeHtml(config.colorBoton)};color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;">
                  ${escapeHtml(textoBoton)}
                </a>
              </p>
              ${paragraphsToHtml(pie)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const text = [
    titulo,
    "",
    cuerpo,
    "",
    `${textoBoton}: ${enlace}`,
    "",
    pie,
  ].join("\n");

  return { subject, html, text };
}

export function parseImagenConfig(raw: string): StoredFile | null {
  return parseImagenConvocatoria(raw);
}
