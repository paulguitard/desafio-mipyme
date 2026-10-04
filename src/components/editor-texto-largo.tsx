"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import { esHtmlVacio } from "@/lib/preguntas";
import { textoContinuo } from "@/lib/texto-continuo";

function htmlParaFormulario(html: string) {
  return esHtmlVacio(html) ? "" : html;
}

const TAMANOS = [
  { label: "Pequeño", value: "0.875rem" },
  { label: "Normal", value: "" },
  { label: "Grande", value: "1.25rem" },
] as const;

const DESTACADORES = [
  { label: "Amarillo", value: "#fef08a" },
  { label: "Verde", value: "#bbf7d0" },
  { label: "Rosa", value: "#fecdd3" },
  { label: "Celeste", value: "#bae6fd" },
] as const;

function IconAlignLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path fill="currentColor" d="M2 3h12v1.5H2zm0 4h8v1.5H2zm0 4h12v1.5H2zm0 4h8v1.5H2z" />
    </svg>
  );
}

function IconAlignCenter() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path fill="currentColor" d="M2 3h12v1.5H2zm2 4h8v1.5H4zm-2 4h12v1.5H2zm2 4h8v1.5H4z" />
    </svg>
  );
}

function IconAlignRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path fill="currentColor" d="M2 3h12v1.5H2zm4 4h8v1.5H6zm-4 4h12v1.5H2zm4 4h8v1.5H6z" />
    </svg>
  );
}

function IconList() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <circle cx="2.5" cy="4" r="1.2" fill="currentColor" />
      <circle cx="2.5" cy="8" r="1.2" fill="currentColor" />
      <circle cx="2.5" cy="12" r="1.2" fill="currentColor" />
      <path fill="currentColor" d="M5.5 3.25h8.5v1.5H5.5zm0 4h8.5v1.5H5.5zm0 4h8.5v1.5H5.5z" />
    </svg>
  );
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`rte-btn${active ? " is-active" : ""}`}
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ToolbarMenu({
  label,
  title,
  open,
  active,
  disabled,
  alignEnd,
  className,
  onToggle,
  children,
}: {
  label: string;
  title: string;
  open: boolean;
  active?: boolean;
  disabled?: boolean;
  alignEnd?: boolean;
  className?: string;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className={`rte-menu${open ? " is-open" : ""}${alignEnd ? " is-end" : ""}${className ? ` ${className}` : ""}`}>
      <button
        type="button"
        className={`rte-btn rte-menu-trigger${active || open ? " is-active" : ""}`}
        title={title}
        aria-label={title}
        aria-expanded={open}
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onToggle}
      >
        {label}
      </button>
      {open ? (
        <div className="rte-menu-panel" role="menu">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function EditorTextoLargo({
  name,
  defaultValue = "",
  disabled,
}: {
  name: string;
  defaultValue?: string;
  disabled?: boolean;
}) {
  const fieldId = useId();
  const hiddenRef = useRef<HTMLInputElement>(null);
  const initial = defaultValue.trim() ? defaultValue : "<p></p>";
  const [html, setHtml] = useState(() => htmlParaFormulario(defaultValue));
  const [menuAbierto, setMenuAbierto] = useState<"tamano" | "destacar" | "alinear" | null>(null);

  const syncHtml = (raw: string) => {
    const next = htmlParaFormulario(raw);
    setHtml(next);
    if (hiddenRef.current) hiddenRef.current.value = next;
  };

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        orderedList: false,
        strike: false,
      }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      FontSize,
      TextAlign.configure({ types: ["paragraph"] }),
    ],
    content: initial,
    onCreate: ({ editor: ed }) => syncHtml(ed.getHTML()),
    onUpdate: ({ editor: ed }) => syncHtml(ed.getHTML()),
    editorProps: {
      attributes: {
        class: "rte-content",
        role: "textbox",
        "aria-multiline": "true",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!menuAbierto) return;
    function onPointerDown(event: PointerEvent) {
      const nodo = event.target;
      if (!(nodo instanceof Element) || !nodo.closest(".rte-menu")) {
        setMenuAbierto(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuAbierto]);

  useEffect(() => {
    if (!editor) return;
    const form = hiddenRef.current?.form;
    if (!form) return;
    const onFormData = (event: FormDataEvent) => {
      event.formData.set(name, htmlParaFormulario(editor.getHTML()));
    };
    form.addEventListener("formdata", onFormData);
    return () => form.removeEventListener("formdata", onFormData);
  }, [editor, name]);

  const tamanoActual = (() => {
    if (!editor) return "";
    const size = String(editor.getAttributes("textStyle").fontSize ?? "");
    if (size === "0.875rem") return "0.875rem";
    if (size === "1.25rem") return "1.25rem";
    return "";
  })();
  const etiquetaTamano = TAMANOS.find((t) => t.value === tamanoActual)?.label ?? "Normal";

  const destacarActivo = Boolean(
    editor &&
      (editor.isActive("highlight") ||
        DESTACADORES.some((color) => editor.isActive("highlight", { color: color.value }))),
  );
  const alinearActivo = Boolean(
    editor && (editor.isActive({ textAlign: "center" }) || editor.isActive({ textAlign: "right" })),
  );

  const botonesDestacar = (
    <>
      {DESTACADORES.map((color) => (
        <ToolbarButton
          key={color.value}
          title={`Destacar ${color.label}`}
          active={editor?.isActive("highlight", { color: color.value })}
          disabled={!editor}
          onClick={() => {
            editor?.chain().focus().toggleHighlight({ color: color.value }).run();
            setMenuAbierto(null);
          }}
        >
          <span className="rte-swatch" style={{ backgroundColor: color.value }} aria-hidden />
        </ToolbarButton>
      ))}
      <ToolbarButton
        title="Quitar destacador"
        disabled={!editor}
        onClick={() => {
          editor?.chain().focus().unsetHighlight().run();
          setMenuAbierto(null);
        }}
      >
        ✕
      </ToolbarButton>
    </>
  );

  const botonesAlinear = (
    <>
      <ToolbarButton
        title="Alinear a la izquierda"
        active={editor?.isActive({ textAlign: "left" })}
        disabled={!editor}
        onClick={() => {
          editor?.chain().focus().setTextAlign("left").run();
          setMenuAbierto(null);
        }}
      >
        <IconAlignLeft />
      </ToolbarButton>
      <ToolbarButton
        title="Centrar"
        active={editor?.isActive({ textAlign: "center" })}
        disabled={!editor}
        onClick={() => {
          editor?.chain().focus().setTextAlign("center").run();
          setMenuAbierto(null);
        }}
      >
        <IconAlignCenter />
      </ToolbarButton>
      <ToolbarButton
        title="Alinear a la derecha"
        active={editor?.isActive({ textAlign: "right" })}
        disabled={!editor}
        onClick={() => {
          editor?.chain().focus().setTextAlign("right").run();
          setMenuAbierto(null);
        }}
      >
        <IconAlignRight />
      </ToolbarButton>
    </>
  );

  return (
    <div className={`rte${disabled ? " is-disabled" : ""}`}>
      <input
        ref={hiddenRef}
        type="hidden"
        id={fieldId}
        name={name}
        value={html}
        readOnly
      />
      {!disabled ? (
        <div className="rte-toolbar" role="toolbar" aria-label="Formato de texto">
          <label className="rte-select-wrap">
            <span className="sr-only">Tamaño de letra</span>
            <select
              className="rte-select"
              value={tamanoActual}
              onChange={(e) => {
                const v = e.target.value;
                if (!editor) return;
                if (!v) {
                  editor.chain().focus().unsetFontSize().run();
                } else {
                  editor.chain().focus().setFontSize(v).run();
                }
              }}
            >
              {TAMANOS.map((t) => (
                <option key={t.label} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <ToolbarMenu
            className="rte-menu-tamano"
            label={etiquetaTamano}
            title="Tamaño de letra"
            open={menuAbierto === "tamano"}
            disabled={!editor}
            onToggle={() => setMenuAbierto((actual) => (actual === "tamano" ? null : "tamano"))}
          >
            {TAMANOS.map((t) => (
              <ToolbarButton
                key={t.label}
                title={t.label}
                active={tamanoActual === t.value}
                disabled={!editor}
                onClick={() => {
                  if (!editor) return;
                  if (!t.value) editor.chain().focus().unsetFontSize().run();
                  else editor.chain().focus().setFontSize(t.value).run();
                  setMenuAbierto(null);
                }}
              >
                {t.label}
              </ToolbarButton>
            ))}
          </ToolbarMenu>

          <span className="rte-sep" aria-hidden />

          <ToolbarButton
            title="Negrita"
            active={editor?.isActive("bold")}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <strong>N</strong>
          </ToolbarButton>
          <ToolbarButton
            title="Cursiva"
            active={editor?.isActive("italic")}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <em>C</em>
          </ToolbarButton>
          <ToolbarButton
            title="Subrayado"
            active={editor?.isActive("underline")}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          >
            <span className="underline">S</span>
          </ToolbarButton>

          <span className="rte-sep" aria-hidden />

          <div className="rte-highlights" role="group" aria-label="Color destacador">
            {botonesDestacar}
          </div>
          <ToolbarMenu
            label="Destacar"
            title="Destacar"
            open={menuAbierto === "destacar"}
            active={destacarActivo}
            disabled={!editor}
            onToggle={() => setMenuAbierto((actual) => (actual === "destacar" ? null : "destacar"))}
          >
            {botonesDestacar}
          </ToolbarMenu>

          <span className="rte-sep" aria-hidden />

          <div className="rte-aligns" role="group" aria-label="Alineación">
            {botonesAlinear}
          </div>
          <ToolbarMenu
            label="Alinear"
            title="Alinear"
            open={menuAbierto === "alinear"}
            active={alinearActivo}
            disabled={!editor}
            alignEnd
            onToggle={() => setMenuAbierto((actual) => (actual === "alinear" ? null : "alinear"))}
          >
            {botonesAlinear}
          </ToolbarMenu>

          <span className="rte-sep" aria-hidden />

          <ToolbarButton
            title="Viñetas"
            active={editor?.isActive("bulletList")}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <IconList />
          </ToolbarButton>
        </div>
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}

export function TextoLargoVista({ html }: { html: string }) {
  if (esHtmlVacio(html)) {
    return <p className="texto-solo-lectura is-vacio">Sin respuesta</p>;
  }

  // Respuestas antiguas en texto plano (sin etiquetas)
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

/** Sanitización liviana para HTML producido por el editor (allowlist). */
function sanitizeClientHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/<\/?(?!\/?(?:p|br|strong|b|em|i|u|mark|ul|ol|li|span)\b)[^>]*>/gi, "");
}
