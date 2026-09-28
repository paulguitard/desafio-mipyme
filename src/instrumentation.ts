export async function register() {
  await import("./lib/env");
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { normalizarCorreosPersistidos } = await import("./lib/normalizar-correos-persistidos");
  try {
    await normalizarCorreosPersistidos();
  } catch (error) {
    console.error("[correo] No se pudieron normalizar correos ya guardados.", error);
  }
}
