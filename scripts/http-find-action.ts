/**
 * Extract action IDs from formulario page HTML/RSC and retry agregarPregunta POST.
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const FORM_ID = process.argv[2] ?? "cmtx7u0lv000lorrc8kssbxv5";

const jar = new Map<string, string>();

function cookieJar(res: Response) {
  const raw =
    typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  for (const c of raw) {
    const [pair] = c.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
}

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  cookieJar(csrfRes);
  const csrf = (await csrfRes.json()) as { csrfToken: string };
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(),
    },
    body: new URLSearchParams({
      csrfToken: csrf.csrfToken,
      email: "admin@test.com",
      password: "bitacora",
      expectedRole: "ADMIN",
      callbackUrl: `${BASE}/admin`,
      json: "true",
    }),
    redirect: "manual",
  });
  cookieJar(loginRes);
  console.log("login", loginRes.status, [...jar.keys()]);
}

async function main() {
  await login();

  const pageRes = await fetch(`${BASE}/admin/formularios/${FORM_ID}`, {
    headers: { Cookie: cookieHeader() },
  });
  const html = await pageRes.text();

  const scriptSrcs = [...html.matchAll(/src="(\/_next\/[^"]+)"/g)].map((m) => m[1]);
  console.log("scripts", scriptSrcs.length);

  const hashes = new Set<string>();
  for (const src of scriptSrcs.slice(0, 40)) {
    const r = await fetch(`${BASE}${src}`, { headers: { Cookie: cookieHeader() } });
    const js = await r.text();
    if (js.includes("agregarPregunta") || js.includes("40f4e7a7")) {
      console.log("hit in", src, "len", js.length);
      for (const m of js.matchAll(/createServerReference\)\([^,]+,\s*"([0-9a-f]+)"/g)) {
        hashes.add(m[1]);
      }
      for (const m of js.matchAll(/"([0-9a-f]{40,})"/g)) {
        if (m[1].startsWith("40")) hashes.add(m[1]);
      }
      const idx = js.indexOf("agregarPregunta");
      if (idx >= 0) console.log("context:", js.slice(idx - 120, idx + 180));
    }
  }

  // Also search SSR chunk we know
  const known = "40f4e7a7b973c0337e1d74d58a0e6c203c3aab96f2";
  hashes.add(known);
  console.log("candidate action ids:", [...hashes]);

  for (const actionId of hashes) {
    const fd = new FormData();
    fd.set("formularioId", FORM_ID);
    fd.set("enunciado", `HTTP try ${actionId.slice(0, 8)} ${Date.now()}`);
    fd.set("ayuda", "texto de ayuda");
    fd.set("tipo", "texto_corto");
    fd.set("opciones", "");
    fd.set("obligatoria", "on");
    fd.set("permiteArchivo", "on");
    fd.set("permiteImagen", "on");

    const res = await fetch(`${BASE}/admin/formularios/${FORM_ID}`, {
      method: "POST",
      headers: {
        Cookie: cookieHeader(),
        "Next-Action": actionId,
        Accept: "text/x-component",
      },
      body: fd,
    });
    const text = await res.text();
    console.log("\n--- action", actionId.slice(0, 12), "status", res.status, "---");
    console.log(text.slice(0, 1500));
    if (text.includes("conNotas") || text.includes("Prisma") || text.includes("ok")) {
      console.log(">>> notable response for", actionId);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
