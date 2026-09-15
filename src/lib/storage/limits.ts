/** Límite duro para archivos genéricos (no imágenes). */
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
/** Peso máximo tras comprimir imágenes. */
export const MAX_IMAGE_BYTES = 250 * 1024;
/** Tope de entrada para imágenes antes de comprimir (evita buffers enormes). */
export const MAX_IMAGE_INPUT_BYTES = 10 * 1024 * 1024;
