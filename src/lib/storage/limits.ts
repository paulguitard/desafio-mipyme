/** Límite duro para archivos genéricos (no imágenes). */
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
/** Límite para PDFs de formalización en Mi Perfil del participante. */
export const MAX_PERFIL_PDF_BYTES = 5 * 1024 * 1024;
/** Máximo de PDFs de formalización por participante. */
export const MAX_DOCUMENTOS_FORMALIZACION = 5;
/** Peso máximo tras comprimir imágenes. */
export const MAX_IMAGE_BYTES = 250 * 1024;
/** Tope de entrada para imágenes antes de comprimir (evita buffers enormes). */
export const MAX_IMAGE_INPUT_BYTES = 10 * 1024 * 1024;
