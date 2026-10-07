import { esHtmlVacio } from "@/lib/preguntas";
import { textoContinuo } from "@/lib/texto-continuo";

/** Sanitización liviana para HTML producido por el editor (allowlist). Conserva estilo de destacado, tamaño y alineación. */
function sanitizeClientHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/<\/?(?!\/?(?:p|br|strong|b|em|i|u|mark|ul|ol|li|span)\b)[^>]*>/gi, "");
}

export function TextoLargoVista({ html }: { html: string }) {
  if (esHtmlVacio(html)) {
    return <p className="texto-solo-lectura is-vacio">Sin respuesta</p>;
  }

  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return <p className="texto-solo-lectura">{textoContinuo(html)}</p>;
  }

  return (
    <div
      className="rte-content rte-readonly texto-solo-lectura"
      dangerouslySetInnerHTML={{ __html: sanitizeClientHtml(html) }}
    />
  );
}
