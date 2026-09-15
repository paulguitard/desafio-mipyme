/**
 * Try calling agregarPregunta; expect auth redirect without session.
 */
import { agregarPregunta } from "../src/actions/formularios";

async function main() {
  const fd = new FormData();
  fd.set("formularioId", process.argv[2] ?? "cmtx7u0lv000lorrc8kssbxv5");
  fd.set("enunciado", "Call agregarPregunta directly");
  fd.set("ayuda", "ayuda");
  fd.set("tipo", "texto_corto");
  fd.set("opciones", "");
  fd.set("obligatoria", "on");

  try {
    const result = await agregarPregunta(fd);
    console.log("RESULT:", result);
  } catch (err) {
    console.error("CAUGHT (likely redirect from requireUser):");
    console.error(err);
    if (err instanceof Error) {
      console.error("message:", err.message);
      console.error("digest:", (err as { digest?: string }).digest);
    }
  }
}

main();
