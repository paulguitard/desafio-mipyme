import sanitizeHtml from "sanitize-html";

const COLORES_DESTACADO = ["#fef08a", "#bbf7d0", "#fecdd3", "#bae6fd"];
const colorDestacado = new RegExp(`^(?:${COLORES_DESTACADO.join("|")})$`, "i");

export function sanitizeRichText(html: string): string {
  const limpio = sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "mark", "ul", "ol", "li", "span"],
    allowedAttributes: {
      span: ["style"],
      mark: ["style", "data-color"],
      p: ["style"],
      li: ["style"],
    },
    allowedStyles: {
      span: {
        "font-size": [/^(?:0\.875rem|1\.25rem)$/],
      },
      mark: {
        "background-color": [colorDestacado],
        color: [/^inherit$/],
      },
      p: {
        "text-align": [/^(?:left|center|right|justify)$/],
      },
      li: {
        "text-align": [/^(?:left|center|right|justify)$/],
      },
    },
    allowedSchemes: [],
    disallowedTagsMode: "discard",
  });

  return limpio.replace(/\sdata-color="([^"]*)"/gi, (full, value: string) =>
    colorDestacado.test(value) ? full : "",
  );
}
