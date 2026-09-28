import sanitizeHtml from "sanitize-html";

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "mark", "ul", "ol", "li", "span"],
    allowedAttributes: {
      span: ["class"],
      mark: ["class"],
      p: ["class"],
      li: ["class"],
    },
    allowedSchemes: [],
    disallowedTagsMode: "discard",
  });
}
